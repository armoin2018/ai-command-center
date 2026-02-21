import { EventEmitter } from 'events';
import axios from 'axios';
import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface ModelClientConfig {
  // Rendering
  enableApiRendering?: boolean;
  mermaidInkUrl?: string;
  plantumlServerUrl?: string;
  defaultRenderFormat?: 'svg' | 'png' | 'pdf';
  
  // Generation
  defaultDiagramType?: string;
  defaultTheme?: string;
  enableNlpGeneration?: boolean;
  
  // Conversion
  defaultConversionDirection?: 'auto' | 'mermaid-to-plantuml' | 'plantuml-to-mermaid';
  preserveComments?: boolean;
  preserveFormatting?: boolean;
  
  // Validation
  enableSyntaxValidation?: boolean;
  enableComplexityAnalysis?: boolean;
  maxDiagramComplexity?: number;
  
  // Templates
  templateDirectory?: string;
  enableCustomTemplates?: boolean;
  
  // Output
  outputDirectory?: string;
  outputNamingPattern?: string;
  overwriteExisting?: boolean;
  
  // Network
  apiTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  
  // Cache
  enableCache?: boolean;
  cacheTtl?: number;
  cacheDirectory?: string;
}

export interface GenerationOptions {
  type?: string;
  format?: 'mermaid' | 'plantuml';
  theme?: string;
  output?: string;
  template?: string;
  data?: any;
}

export interface ConversionOptions {
  targetFormat?: 'mermaid' | 'plantuml' | 'auto';
  preserveComments?: boolean;
  preserveFormatting?: boolean;
  output?: string;
}

export interface RenderOptions {
  format?: 'svg' | 'png' | 'pdf';
  output?: string;
  api?: 'mermaid-ink' | 'plantuml-server' | 'auto';
  theme?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    type: string;
    format: string;
    lineCount: number;
  };
}

export interface ComplexityAnalysis {
  nodeCount: number;
  edgeCount: number;
  maxDepth: number;
  complexity: 'low' | 'medium' | 'high';
  score: number;
}

export class ModelClient extends EventEmitter {
  private config: Required<ModelClientConfig>;
  private cache: Map<string, { data: any; timestamp: number }>;

  constructor(config: ModelClientConfig = {}) {
    super();
    
    this.config = {
      enableApiRendering: config.enableApiRendering ?? false,
      mermaidInkUrl: config.mermaidInkUrl ?? 'https://mermaid.ink',
      plantumlServerUrl: config.plantumlServerUrl ?? 'https://www.plantuml.com/plantuml',
      defaultRenderFormat: config.defaultRenderFormat ?? 'svg',
      defaultDiagramType: config.defaultDiagramType ?? 'flowchart',
      defaultTheme: config.defaultTheme ?? 'default',
      enableNlpGeneration: config.enableNlpGeneration ?? true,
      defaultConversionDirection: config.defaultConversionDirection ?? 'auto',
      preserveComments: config.preserveComments ?? true,
      preserveFormatting: config.preserveFormatting ?? true,
      enableSyntaxValidation: config.enableSyntaxValidation ?? true,
      enableComplexityAnalysis: config.enableComplexityAnalysis ?? true,
      maxDiagramComplexity: config.maxDiagramComplexity ?? 1000,
      templateDirectory: config.templateDirectory ?? './templates',
      enableCustomTemplates: config.enableCustomTemplates ?? true,
      outputDirectory: config.outputDirectory ?? './output',
      outputNamingPattern: config.outputNamingPattern ?? '{name}.{format}',
      overwriteExisting: config.overwriteExisting ?? false,
      apiTimeout: config.apiTimeout ?? 10000,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enableCache: config.enableCache ?? true,
      cacheTtl: config.cacheTtl ?? 3600,
      cacheDirectory: config.cacheDirectory ?? './.cache'
    };
    
    this.cache = new Map();
  }

  // ============================================
  // Generation API
  // ============================================

  public generate = {
    fromNaturalLanguage: async (description: string, options: GenerationOptions = {}): Promise<string> => {
      const type = options.type ?? this.config.defaultDiagramType;
      const format = options.format ?? 'mermaid';
      const theme = options.theme ?? this.config.defaultTheme;

      this.emit('generation-started', { description, type, format });

      // Generate diagram from natural language
      const diagram = this.generateFromNL(description, type, format, theme);

      if (options.output) {
        await fs.writeFile(options.output, diagram, 'utf8');
      }

      this.emit('diagram-generated', { type, format, lineCount: diagram.split('\n').length });

      return diagram;
    },

    fromJSON: async (data: any, options: GenerationOptions = {}): Promise<string> => {
      const type = options.type ?? this.config.defaultDiagramType;
      const format = options.format ?? 'mermaid';

      let jsonData = data;
      if (typeof data === 'string') {
        // File path
        const content = await fs.readFile(data, 'utf8');
        jsonData = JSON.parse(content);
      }

      this.emit('generation-started', { source: 'json', type, format });

      const diagram = this.generateFromData(jsonData, type, format);

      if (options.output) {
        await fs.writeFile(options.output, diagram, 'utf8');
      }

      this.emit('diagram-generated', { type, format, lineCount: diagram.split('\n').length });

      return diagram;
    },

    fromYAML: async (data: any, options: GenerationOptions = {}): Promise<string> => {
      const type = options.type ?? this.config.defaultDiagramType;
      const format = options.format ?? 'mermaid';

      let yamlData = data;
      if (typeof data === 'string') {
        // File path or YAML string
        if (await fs.pathExists(data)) {
          const content = await fs.readFile(data, 'utf8');
          yamlData = yaml.load(content);
        } else {
          yamlData = yaml.load(data);
        }
      }

      this.emit('generation-started', { source: 'yaml', type, format });

      const diagram = this.generateFromData(yamlData, type, format);

      if (options.output) {
        await fs.writeFile(options.output, diagram, 'utf8');
      }

      this.emit('diagram-generated', { type, format, lineCount: diagram.split('\n').length });

      return diagram;
    },

    fromCSV: async (filePath: string, options: GenerationOptions = {}): Promise<string> => {
      const type = options.type ?? 'er';
      const format = options.format ?? 'mermaid';

      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').map(line => line.trim()).filter(line => line);
      const headers = lines[0].split(',');
      const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        const row: any = {};
        headers.forEach((header, i) => {
          row[header.trim()] = values[i]?.trim();
        });
        return row;
      });

      this.emit('generation-started', { source: 'csv', type, format });

      const diagram = this.generateFromData({ rows, headers }, type, format);

      if (options.output) {
        await fs.writeFile(options.output, diagram, 'utf8');
      }

      this.emit('diagram-generated', { type, format, lineCount: diagram.split('\n').length });

      return diagram;
    },

    fromTemplate: async (templateName: string, options: GenerationOptions = {}): Promise<string> => {
      const templatePath = path.join(this.config.templateDirectory, `${templateName}.template`);
      
      if (!await fs.pathExists(templatePath)) {
        throw new Error(`Template not found: ${templateName}`);
      }

      let template = await fs.readFile(templatePath, 'utf8');
      
      // Apply data to template (mustache-style)
      if (options.data) {
        template = this.applyTemplateData(template, options.data);
      }

      if (options.output) {
        await fs.writeFile(options.output, template, 'utf8');
      }

      this.emit('diagram-generated', { source: 'template', template: templateName });

      return template;
    }
  };

  // ============================================
  // Conversion API
  // ============================================

  public convert = {
    mermaidToPlantUML: async (mermaidCode: string, options: ConversionOptions = {}): Promise<string> => {
      this.emit('conversion-started', { from: 'mermaid', to: 'plantuml' });

      const plantuml = this.convertMermaidToPlantUML(mermaidCode, options);

      if (options.output) {
        await fs.writeFile(options.output, plantuml, 'utf8');
      }

      this.emit('conversion-complete', { from: 'mermaid', to: 'plantuml' });

      return plantuml;
    },

    plantUMLToMermaid: async (plantumlCode: string, options: ConversionOptions = {}): Promise<string> => {
      this.emit('conversion-started', { from: 'plantuml', to: 'mermaid' });

      const mermaid = this.convertPlantUMLToMermaid(plantumlCode, options);

      if (options.output) {
        await fs.writeFile(options.output, mermaid, 'utf8');
      }

      this.emit('conversion-complete', { from: 'plantuml', to: 'mermaid' });

      return mermaid;
    },

    auto: async (code: string, options: ConversionOptions = {}): Promise<string> => {
      const format = this.detectFormat(code);
      
      if (format === 'mermaid') {
        return this.convert.mermaidToPlantUML(code, options);
      } else if (format === 'plantuml') {
        return this.convert.plantUMLToMermaid(code, options);
      } else {
        throw new Error('Unable to detect diagram format');
      }
    }
  };

  // ============================================
  // Parsing & Validation API
  // ============================================

  public async parse(code: string): Promise<any> {
    const format = this.detectFormat(code);
    
    if (format === 'mermaid') {
      return this.parseMermaid(code);
    } else if (format === 'plantuml') {
      return this.parsePlantUML(code);
    } else {
      throw new Error('Unable to detect diagram format');
    }
  }

  public async validate(code: string): Promise<ValidationResult> {
    const format = this.detectFormat(code);
    const lines = code.split('\n');

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        type: 'unknown',
        format,
        lineCount: lines.length
      }
    };

    try {
      if (format === 'mermaid') {
        this.validateMermaid(code, result);
      } else if (format === 'plantuml') {
        this.validatePlantUML(code, result);
      } else {
        result.isValid = false;
        result.errors.push('Unable to detect diagram format');
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    if (!result.isValid) {
      this.emit('validation-failed', { errors: result.errors, format });
    }

    return result;
  }

  public async analyze(code: string): Promise<ComplexityAnalysis> {
    const format = this.detectFormat(code);
    const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('%%'));

    const analysis: ComplexityAnalysis = {
      nodeCount: 0,
      edgeCount: 0,
      maxDepth: 1,
      complexity: 'low',
      score: 0
    };

    if (format === 'mermaid') {
      // Count nodes and edges in Mermaid
      analysis.nodeCount = (code.match(/\[.*?\]|{.*?}|\(.*?\)|>.*?]/g) || []).length;
      analysis.edgeCount = (code.match(/-->|---|->|==|==/g) || []).length;
    } else if (format === 'plantuml') {
      // Count participants and arrows in PlantUML
      analysis.nodeCount = (code.match(/participant|actor|boundary|control|entity|database|collections/g) || []).length;
      analysis.edgeCount = (code.match(/->|-->|<->|<-->/g) || []).length;
    }

    // Calculate complexity
    analysis.score = analysis.nodeCount + (analysis.edgeCount * 1.5);
    
    if (analysis.score < 20) {
      analysis.complexity = 'low';
    } else if (analysis.score < 50) {
      analysis.complexity = 'medium';
    } else {
      analysis.complexity = 'high';
    }

    return analysis;
  }

  // ============================================
  // Rendering API (Optional)
  // ============================================

  public async render(code: string, options: RenderOptions = {}): Promise<void> {
    if (!this.config.enableApiRendering) {
      throw new Error('API rendering is disabled. Set ENABLE_API_RENDERING=true in .env');
    }

    const format = this.detectFormat(code);
    const outputFormat = options.format ?? this.config.defaultRenderFormat;
    const api = options.api ?? (format === 'mermaid' ? 'mermaid-ink' : 'plantuml-server');

    this.emit('render-started', { format, outputFormat, api });

    let imageData: Buffer;

    if (api === 'mermaid-ink') {
      imageData = await this.renderMermaidInk(code, outputFormat, options.theme);
    } else if (api === 'plantuml-server') {
      imageData = await this.renderPlantUMLServer(code, outputFormat);
    } else {
      throw new Error(`Unsupported API: ${api}`);
    }

    if (options.output) {
      await fs.writeFile(options.output, imageData);
    }

    this.emit('render-complete', { format: outputFormat, size: imageData.length });
  }

  public async getRenderUrl(code: string, options: RenderOptions = {}): Promise<string> {
    const format = this.detectFormat(code);
    const outputFormat = options.format ?? this.config.defaultRenderFormat;
    const api = options.api ?? (format === 'mermaid' ? 'mermaid-ink' : 'plantuml-server');

    if (api === 'mermaid-ink') {
      const encoded = Buffer.from(code).toString('base64');
      return `${this.config.mermaidInkUrl}/${outputFormat}/${encoded}`;
    } else if (api === 'plantuml-server') {
      const encoded = this.encodePlantUML(code);
      return `${this.config.plantumlServerUrl}/${outputFormat}/${encoded}`;
    } else {
      throw new Error(`Unsupported API: ${api}`);
    }
  }

  // ============================================
  // Template API
  // ============================================

  public template = {
    list: async (): Promise<string[]> => {
      const templatesDir = this.config.templateDirectory;
      
      if (!await fs.pathExists(templatesDir)) {
        await fs.ensureDir(templatesDir);
        return [];
      }

      const files = await fs.readdir(templatesDir);
      return files
        .filter(file => file.endsWith('.template'))
        .map(file => file.replace('.template', ''));
    },

    get: async (name: string): Promise<string> => {
      const templatePath = path.join(this.config.templateDirectory, `${name}.template`);
      
      if (!await fs.pathExists(templatePath)) {
        throw new Error(`Template not found: ${name}`);
      }

      return fs.readFile(templatePath, 'utf8');
    },

    use: async (name: string, data: any = {}): Promise<string> => {
      const template = await this.template.get(name);
      return this.applyTemplateData(template, data);
    },

    create: async (name: string, content: string): Promise<void> => {
      const templatePath = path.join(this.config.templateDirectory, `${name}.template`);
      await fs.ensureDir(this.config.templateDirectory);
      await fs.writeFile(templatePath, content, 'utf8');
      
      this.emit('template-created', { name });
    },

    delete: async (name: string): Promise<void> => {
      const templatePath = path.join(this.config.templateDirectory, `${name}.template`);
      
      if (await fs.pathExists(templatePath)) {
        await fs.remove(templatePath);
        this.emit('template-deleted', { name });
      }
    }
  };

  // ============================================
  // Batch Processing API
  // ============================================

  public batch = {
    process: async (patterns: string[], options: any = {}): Promise<any> => {
      const files: string[] = [];
      
      // Expand glob patterns (simple implementation)
      for (const pattern of patterns) {
        if (await fs.pathExists(pattern)) {
          const stat = await fs.stat(pattern);
          if (stat.isFile()) {
            files.push(pattern);
          } else if (stat.isDirectory()) {
            const dirFiles = await fs.readdir(pattern);
            files.push(...dirFiles.map(f => path.join(pattern, f)));
          }
        }
      }

      const results = {
        total: files.length,
        successful: 0,
        failed: [] as string[]
      };

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          
          if (options.operation === 'convert') {
            const converted = await this.convert.auto(content, {
              targetFormat: options.targetFormat,
              output: path.join(options.outputDirectory || '.', path.basename(file))
            });
          } else if (options.operation === 'validate') {
            await this.validate(content);
          } else if (options.operation === 'render') {
            await this.render(content, {
              format: options.format,
              output: path.join(options.outputDirectory || '.', path.basename(file, path.extname(file)) + `.${options.format}`)
            });
          }
          
          results.successful++;
          this.emit('batch-progress', { completed: results.successful, total: results.total });
        } catch (error) {
          results.failed.push(file);
        }
      }

      return results;
    }
  };

  // ============================================
  // Private Helper Methods
  // ============================================

  private generateFromNL(description: string, type: string, format: string, theme: string): string {
    // Simplified NLP-based generation
    // In production, this would use more sophisticated NLP/AI
    
    if (format === 'mermaid') {
      return this.generateMermaidFromNL(description, type, theme);
    } else {
      return this.generatePlantUMLFromNL(description, type);
    }
  }

  private generateMermaidFromNL(description: string, type: string, theme: string): string {
    const lines: string[] = [];
    
    if (type === 'flowchart') {
      lines.push('flowchart TD');
      const steps = description.split(/,|and|then/).map(s => s.trim()).filter(s => s);
      steps.forEach((step, i) => {
        const nodeId = `N${i + 1}`;
        lines.push(`    ${nodeId}[${step}]`);
        if (i > 0) {
          lines.push(`    N${i} --> ${nodeId}`);
        }
      });
    } else if (type === 'sequence') {
      lines.push('sequenceDiagram');
      lines.push('    participant User');
      lines.push('    participant System');
      const steps = description.split(/,|and|then/).map(s => s.trim()).filter(s => s);
      steps.forEach(step => {
        lines.push(`    User->>System: ${step}`);
      });
    }
    
    return lines.join('\n');
  }

  private generatePlantUMLFromNL(description: string, type: string): string {
    const lines: string[] = [];
    lines.push('@startuml');
    
    if (type === 'sequence') {
      const steps = description.split(/,|and|then/).map(s => s.trim()).filter(s => s);
      steps.forEach(step => {
        lines.push(`User -> System: ${step}`);
      });
    }
    
    lines.push('@enduml');
    return lines.join('\n');
  }

  private generateFromData(data: any, type: string, format: string): string {
    // Generate diagram from structured data
    if (format === 'mermaid') {
      return this.generateMermaidFromData(data, type);
    } else {
      return this.generatePlantUMLFromData(data, type);
    }
  }

  private generateMermaidFromData(data: any, type: string): string {
    const lines: string[] = [];
    
    if (type === 'class' && data.classes) {
      lines.push('classDiagram');
      data.classes.forEach((cls: any) => {
        lines.push(`    class ${cls.name} {`);
        if (cls.properties) {
          cls.properties.forEach((prop: string) => lines.push(`        ${prop}`));
        }
        if (cls.methods) {
          cls.methods.forEach((method: string) => lines.push(`        ${method}()`));
        }
        lines.push('    }');
      });
      
      if (data.relationships) {
        data.relationships.forEach((rel: any) => {
          const arrow = rel.type === 'inheritance' ? '<|--' : '-->';
          lines.push(`    ${rel.from} ${arrow} ${rel.to}`);
        });
      }
    }
    
    return lines.join('\n');
  }

  private generatePlantUMLFromData(data: any, type: string): string {
    const lines: string[] = ['@startuml'];
    
    if (type === 'class' && data.classes) {
      data.classes.forEach((cls: any) => {
        lines.push(`class ${cls.name} {`);
        if (cls.properties) {
          cls.properties.forEach((prop: string) => lines.push(`  ${prop}`));
        }
        if (cls.methods) {
          cls.methods.forEach((method: string) => lines.push(`  ${method}()`));
        }
        lines.push('}');
      });
    }
    
    lines.push('@enduml');
    return lines.join('\n');
  }

  private convertMermaidToPlantUML(mermaid: string, options: ConversionOptions): string {
    // Simplified conversion - production would be more comprehensive
    const lines: string[] = ['@startuml'];
    
    if (mermaid.includes('sequenceDiagram')) {
      const mermaidLines = mermaid.split('\n');
      mermaidLines.forEach(line => {
        if (line.includes('->>')) {
          const converted = line.replace(/participant (\w+)/, 'actor $1')
            .replace(/->>/, '->')
            .replace(/-->>/, '-->');
          lines.push(converted);
        }
      });
    }
    
    lines.push('@enduml');
    return lines.join('\n');
  }

  private convertPlantUMLToMermaid(plantuml: string, options: ConversionOptions): string {
    // Simplified conversion - production would be more comprehensive
    const lines: string[] = [];
    
    if (plantuml.includes('->')) {
      lines.push('sequenceDiagram');
      const plantumlLines = plantuml.split('\n');
      plantumlLines.forEach(line => {
        if (line.includes('->')) {
          const converted = line.replace(/actor (\w+)/, 'participant $1')
            .replace(/->/, '->>')
            .replace(/-->/, '-->>')
            .trim();
          if (converted && !converted.includes('@')) {
            lines.push(`    ${converted}`);
          }
        }
      });
    }
    
    return lines.join('\n');
  }

  private detectFormat(code: string): 'mermaid' | 'plantuml' | 'unknown' {
    if (code.includes('@startuml') || code.includes('@enduml')) {
      return 'plantuml';
    } else if (code.match(/^(flowchart|sequenceDiagram|classDiagram|erDiagram|gantt|stateDiagram)/m)) {
      return 'mermaid';
    }
    return 'unknown';
  }

  private parseMermaid(code: string): any {
    return {
      format: 'mermaid',
      type: code.match(/^(\w+)/)?.[1] || 'unknown',
      lines: code.split('\n').length
    };
  }

  private parsePlantUML(code: string): any {
    return {
      format: 'plantuml',
      type: 'sequence',
      lines: code.split('\n').length
    };
  }

  private validateMermaid(code: string, result: ValidationResult): void {
    const type = code.match(/^(\w+)/)?.[1];
    if (!type) {
      result.isValid = false;
      result.errors.push('Missing diagram type declaration');
      return;
    }

    result.metadata!.type = type;
    
    // Check for basic syntax issues
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;
    
    if (openBrackets !== closeBrackets) {
      result.isValid = false;
      result.errors.push('Mismatched brackets');
    }
  }

  private validatePlantUML(code: string, result: ValidationResult): void {
    if (!code.includes('@startuml')) {
      result.isValid = false;
      result.errors.push('Missing @startuml declaration');
    }
    
    if (!code.includes('@enduml')) {
      result.isValid = false;
      result.errors.push('Missing @enduml declaration');
    }
    
    result.metadata!.type = 'plantuml';
  }

  private async renderMermaidInk(code: string, format: string, theme?: string): Promise<Buffer> {
    const encoded = Buffer.from(code).toString('base64');
    const url = `${this.config.mermaidInkUrl}/${format}/${encoded}`;
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: this.config.apiTimeout
    });
    
    return Buffer.from(response.data);
  }

  private async renderPlantUMLServer(code: string, format: string): Promise<Buffer> {
    const encoded = this.encodePlantUML(code);
    const url = `${this.config.plantumlServerUrl}/${format}/${encoded}`;
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: this.config.apiTimeout
    });
    
    return Buffer.from(response.data);
  }

  private encodePlantUML(text: string): string {
    // PlantUML encoding (simplified)
    return Buffer.from(text).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private applyTemplateData(template: string, data: any): string {
    let result = template;
    
    // Simple mustache-style replacement
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, data[key]);
    });
    
    return result;
  }
}

export default ModelClient;
