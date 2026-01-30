/**
 * Diagram Converter
 * 
 * Converts PlantUML syntax to Mermaid syntax for various diagram types
 */

import { Logger } from './logger';

export type DiagramType = 
    | 'sequence'
    | 'class'
    | 'flowchart'
    | 'state'
    | 'er'
    | 'activity'
    | 'component'
    | 'unknown';

export interface ConversionResult {
    success: boolean;
    mermaidCode: string;
    diagramType: DiagramType;
    warnings: string[];
    errors: string[];
}

export class DiagramConverter {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Convert PlantUML code to Mermaid code
     */
    convert(plantUMLCode: string): ConversionResult {
        const cleanCode = this.cleanPlantUML(plantUMLCode);
        const diagramType = this.detectDiagramType(cleanCode);
        
        const result: ConversionResult = {
            success: false,
            mermaidCode: '',
            diagramType,
            warnings: [],
            errors: []
        };

        try {
            switch (diagramType) {
                case 'sequence':
                    result.mermaidCode = this.convertSequenceDiagram(cleanCode);
                    break;
                case 'class':
                    result.mermaidCode = this.convertClassDiagram(cleanCode);
                    break;
                case 'flowchart':
                case 'activity':
                    result.mermaidCode = this.convertFlowchart(cleanCode);
                    break;
                case 'state':
                    result.mermaidCode = this.convertStateDiagram(cleanCode);
                    break;
                case 'er':
                    result.mermaidCode = this.convertERDiagram(cleanCode);
                    break;
                case 'component':
                    result.warnings.push('Component diagrams are not directly supported in Mermaid. Converting to flowchart.');
                    result.mermaidCode = this.convertComponentDiagram(cleanCode);
                    break;
                default:
                    result.errors.push('Unknown diagram type. Attempting generic conversion.');
                    result.mermaidCode = this.convertGeneric(cleanCode);
            }

            result.success = result.mermaidCode.length > 0;
            this.logger.info('Diagram conversion completed', { type: diagramType, success: result.success });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.errors.push(`Conversion failed: ${message}`);
            this.logger.error('Diagram conversion failed', { error: message });
        }

        return result;
    }

    /**
     * Clean PlantUML code by removing @startuml/@enduml and comments
     */
    private cleanPlantUML(code: string): string {
        return code
            .replace(/@startuml.*?\n/gi, '')
            .replace(/@enduml.*?\n/gi, '')
            .replace(/^'\s*.*$/gm, '') // Single-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Multi-line comments
            .trim();
    }

    /**
     * Detect diagram type from PlantUML code
     */
    private detectDiagramType(code: string): DiagramType {
        const lowerCode = code.toLowerCase();

        if (lowerCode.includes('->') || lowerCode.includes('-->') || lowerCode.includes('participant')) {
            return 'sequence';
        }
        if (lowerCode.includes('class ') || lowerCode.includes('interface ') || lowerCode.includes('abstract ')) {
            return 'class';
        }
        if (lowerCode.includes('state ') || lowerCode.includes('[*]')) {
            return 'state';
        }
        if (lowerCode.includes('entity ') || lowerCode.includes('||') || lowerCode.includes('o{') || lowerCode.includes('}o')) {
            return 'er';
        }
        if (lowerCode.includes('component') || lowerCode.includes('package')) {
            return 'component';
        }
        if (lowerCode.includes('if (') || lowerCode.includes('while (') || lowerCode.includes('endif')) {
            return 'activity';
        }
        if (lowerCode.match(/\s*\w+\s*-->?\s*\w+/)) {
            return 'flowchart';
        }

        return 'unknown';
    }

    /**
     * Convert sequence diagram
     */
    private convertSequenceDiagram(code: string): string {
        let mermaid = 'sequenceDiagram\n';
        const lines = code.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Participant declaration
            if (trimmed.match(/^(participant|actor|boundary|control|entity|database)\s+(\w+)/i)) {
                const match = trimmed.match(/^(participant|actor)\s+(\w+)(?:\s+as\s+"([^"]+)")?/i);
                if (match) {
                    const [, , id, alias] = match;
                    mermaid += `    participant ${id}${alias ? ` as ${alias}` : ''}\n`;
                }
                continue;
            }

            // Message: A -> B: message
            const messageMatch = trimmed.match(/(\w+)\s*(--?>|<--?)\s*(\w+)\s*:\s*(.+)/);
            if (messageMatch) {
                const [, from, arrow, to, message] = messageMatch;
                const arrowType = arrow.includes('--') ? '-->' : '->';
                const direction = arrow.startsWith('<') ? `${to}${arrowType}${from}` : `${from}${arrowType}${to}`;
                mermaid += `    ${direction}: ${message}\n`;
                continue;
            }

            // Activation: activate/deactivate
            if (trimmed.match(/^activate\s+(\w+)/i)) {
                const match = trimmed.match(/^activate\s+(\w+)/i);
                if (match) {
                    mermaid += `    activate ${match[1]}\n`;
                }
                continue;
            }
            if (trimmed.match(/^deactivate\s+(\w+)/i)) {
                const match = trimmed.match(/^deactivate\s+(\w+)/i);
                if (match) {
                    mermaid += `    deactivate ${match[1]}\n`;
                }
                continue;
            }

            // Notes
            const noteMatch = trimmed.match(/^note\s+(left|right|over)\s+(?:of\s+)?(\w+)(?:\s*,\s*(\w+))?\s*:\s*(.+)/i);
            if (noteMatch) {
                const [, position, actor1, actor2, text] = noteMatch;
                if (actor2) {
                    mermaid += `    Note over ${actor1},${actor2}: ${text}\n`;
                } else {
                    mermaid += `    Note ${position} of ${actor1}: ${text}\n`;
                }
                continue;
            }

            // Alt/else/end blocks
            if (trimmed.match(/^alt\s+(.+)/i)) {
                const match = trimmed.match(/^alt\s+(.+)/i);
                mermaid += `    alt ${match![1]}\n`;
                continue;
            }
            if (trimmed.match(/^else\s*(.+)?/i)) {
                const match = trimmed.match(/^else\s*(.+)?/i);
                mermaid += `    else${match![1] ? ' ' + match![1] : ''}\n`;
                continue;
            }
            if (trimmed.match(/^end$/i)) {
                mermaid += `    end\n`;
                continue;
            }

            // Loop
            if (trimmed.match(/^loop\s+(.+)/i)) {
                const match = trimmed.match(/^loop\s+(.+)/i);
                mermaid += `    loop ${match![1]}\n`;
                continue;
            }
        }

        return mermaid;
    }

    /**
     * Convert class diagram
     */
    private convertClassDiagram(code: string): string {
        let mermaid = 'classDiagram\n';
        const lines = code.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Class declaration
            const classMatch = trimmed.match(/^(class|interface|abstract class|enum)\s+(\w+)\s*(?:{)?/i);
            if (classMatch) {
                const [, type, name] = classMatch;
                if (type.toLowerCase().includes('abstract')) {
                    mermaid += `    class ${name}\n    <<abstract>> ${name}\n`;
                } else if (type.toLowerCase() === 'interface') {
                    mermaid += `    class ${name}\n    <<interface>> ${name}\n`;
                } else if (type.toLowerCase() === 'enum') {
                    mermaid += `    class ${name}\n    <<enumeration>> ${name}\n`;
                } else {
                    mermaid += `    class ${name}\n`;
                }
                continue;
            }

            // Member variables/methods (inside class)
            const memberMatch = trimmed.match(/^([+\-#~])?\s*(\w+)\s*:\s*(\w+)/);
            if (memberMatch) {
                const [, visibility, name, type] = memberMatch;
                const vis = this.convertVisibility(visibility);
                mermaid += `    ${vis}${type} ${name}\n`;
                continue;
            }

            const methodMatch = trimmed.match(/^([+\-#~])?\s*(\w+)\s*\(([^)]*)\)\s*(?::\s*(\w+))?/);
            if (methodMatch) {
                const [, visibility, name, params, returnType] = methodMatch;
                const vis = this.convertVisibility(visibility);
                mermaid += `    ${vis}${name}(${params})${returnType ? ' ' + returnType : ''}\n`;
                continue;
            }

            // Relationships
            const relMatch = trimmed.match(/(\w+)\s+([<>o*+]?-{1,2}[<>o*+]?)\s+(\w+)(?:\s*:\s*(.+))?/);
            if (relMatch) {
                const [, from, arrow, to, label] = relMatch;
                const relationship = this.convertRelationship(arrow);
                mermaid += `    ${from} ${relationship} ${to}${label ? ' : ' + label : ''}\n`;
                continue;
            }
        }

        return mermaid;
    }

    /**
     * Convert flowchart/activity diagram
     */
    private convertFlowchart(code: string): string {
        let mermaid = 'flowchart TD\n';
        const lines = code.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Start/end nodes
            if (trimmed.match(/^\(\*\)/)) {
                mermaid += `    Start([Start])\n`;
                continue;
            }
            if (trimmed.match(/^end$/i)) {
                mermaid += `    End([End])\n`;
                continue;
            }

            // Decision
            const ifMatch = trimmed.match(/^if\s*\((.+)\)\s*then\s*\((.+)\)/i);
            if (ifMatch) {
                const [, condition, yes] = ifMatch;
                mermaid += `    Decision{${condition}}\n    Decision -->|Yes| ${yes.replace(/\s+/g, '_')}\n`;
                continue;
            }

            // Simple arrows
            const arrowMatch = trimmed.match(/(\w+)\s*--?>?\s*(\w+)(?:\s*:\s*(.+))?/);
            if (arrowMatch) {
                const [, from, to, label] = arrowMatch;
                mermaid += `    ${from} -->${label ? `|${label}|` : ''} ${to}\n`;
                continue;
            }

            // Activity/action
            const activityMatch = trimmed.match(/^:(.+);/);
            if (activityMatch) {
                const id = activityMatch[1].replace(/\s+/g, '_');
                mermaid += `    ${id}[${activityMatch[1]}]\n`;
                continue;
            }
        }

        return mermaid;
    }

    /**
     * Convert state diagram
     */
    private convertStateDiagram(code: string): string {
        let mermaid = 'stateDiagram-v2\n';
        const lines = code.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Start/end state
            if (trimmed.includes('[*]')) {
                const transitionMatch = trimmed.match(/\[\*\]\s*--?>?\s*(\w+)/);
                if (transitionMatch) {
                    mermaid += `    [*] --> ${transitionMatch[1]}\n`;
                    continue;
                }
                const endMatch = trimmed.match(/(\w+)\s*--?>?\s*\[\*\]/);
                if (endMatch) {
                    mermaid += `    ${endMatch[1]} --> [*]\n`;
                    continue;
                }
            }

            // State transition
            const transMatch = trimmed.match(/(\w+)\s*--?>?\s*(\w+)(?:\s*:\s*(.+))?/);
            if (transMatch) {
                const [, from, to, label] = transMatch;
                mermaid += `    ${from} --> ${to}${label ? ' : ' + label : ''}\n`;
                continue;
            }

            // State declaration with description
            const stateMatch = trimmed.match(/^state\s+"(.+)"\s+as\s+(\w+)/i);
            if (stateMatch) {
                const [, description, id] = stateMatch;
                mermaid += `    ${id}: ${description}\n`;
                continue;
            }
        }

        return mermaid;
    }

    /**
     * Convert ER diagram
     */
    private convertERDiagram(code: string): string {
        let mermaid = 'erDiagram\n';
        const lines = code.split('\n');
        let currentEntity = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Entity declaration
            const entityMatch = trimmed.match(/^entity\s+(\w+)/i);
            if (entityMatch) {
                currentEntity = entityMatch[1];
                mermaid += `    ${currentEntity} {\n`;
                continue;
            }

            // End entity
            if (trimmed === '}' && currentEntity) {
                mermaid += `    }\n`;
                currentEntity = '';
                continue;
            }

            // Attribute inside entity
            if (currentEntity && trimmed.match(/^\w+\s+\w+/)) {
                const attrMatch = trimmed.match(/^(\w+)\s+(\w+)/);
                if (attrMatch) {
                    mermaid += `        ${attrMatch[1]} ${attrMatch[2]}\n`;
                }
                continue;
            }

            // Relationships
            const relMatch = trimmed.match(/(\w+)\s+(o?\|?\||o?\{|\}o|o?o)\s*--\s*(o?\|?\||o?\{|\}o|o?o)\s+(\w+)(?:\s*:\s*(.+))?/);
            if (relMatch) {
                const [, entity1, card1, card2, entity2, label] = relMatch;
                const cardinality = this.convertERCardinality(card1, card2);
                mermaid += `    ${entity1} ${cardinality} ${entity2} : "${label || 'has'}"\n`;
                continue;
            }
        }

        return mermaid;
    }

    /**
     * Convert component diagram to flowchart
     */
    private convertComponentDiagram(code: string): string {
        let mermaid = 'flowchart TD\n';
        const lines = code.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Component/package
            const compMatch = trimmed.match(/^(component|package)\s+(\w+)/i);
            if (compMatch) {
                const [, , name] = compMatch;
                mermaid += `    ${name}[${name}]\n`;
                continue;
            }

            // Connections
            const connMatch = trimmed.match(/(\w+)\s*--?>?\s*(\w+)/);
            if (connMatch) {
                const [, from, to] = connMatch;
                mermaid += `    ${from} --> ${to}\n`;
                continue;
            }
        }

        return mermaid;
    }

    /**
     * Generic conversion fallback
     */
    private convertGeneric(_code: string): string {
        return 'flowchart TD\n    A[Unable to convert diagram]\n    A --> B[Please check PlantUML syntax]\n';
    }

    /**
     * Convert PlantUML visibility to Mermaid
     */
    private convertVisibility(visibility?: string): string {
        switch (visibility) {
            case '+': return '+';
            case '-': return '-';
            case '#': return '#';
            case '~': return '~';
            default: return '+';
        }
    }

    /**
     * Convert PlantUML relationship to Mermaid
     */
    private convertRelationship(arrow: string): string {
        if (arrow.includes('<|--')) return '<|--';
        if (arrow.includes('--|>')) return '--|>';
        if (arrow.includes('*--')) return '*--';
        if (arrow.includes('--*')) return '--*';
        if (arrow.includes('o--')) return 'o--';
        if (arrow.includes('--o')) return '--o';
        if (arrow.includes('<--')) return '<--';
        if (arrow.includes('-->')) return '-->';
        if (arrow.includes('..>')) return '..>';
        if (arrow.includes('<..')) return '<..';
        return '-->';
    }

    /**
     * Convert ER cardinality
     */
    private convertERCardinality(card1: string, card2: string): string {
        const c1 = card1.includes('{') ? 'o{' : card1.includes('o') ? 'o|' : '||';
        const c2 = card2.includes('}') ? '}o' : card2.includes('o') ? '|o' : '||';
        return `${c1}--${c2}`;
    }
}
