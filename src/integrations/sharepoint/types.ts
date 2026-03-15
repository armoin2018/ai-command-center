/**
 * Microsoft SharePoint Online Integration Types
 *
 * Core type definitions for SharePoint Online integration via Microsoft Graph API.
 */

export interface SharePointConfig {
    /** Whether this integration is enabled */
    enabled: boolean;
    /** Azure AD tenant ID */
    tenantId: string;
    /** Azure AD application (client) ID */
    clientId: string;
    /** SharePoint site URL (e.g., https://contoso.sharepoint.com/sites/mysite) */
    siteUrl?: string;
    /** Default site ID for operations */
    defaultSiteId?: string;
}

export interface SharePointSite {
    /** Site unique identifier */
    id: string;
    /** Display name of the site */
    displayName: string;
    /** Web URL of the site */
    webUrl: string;
    /** Optional site description */
    description?: string;
}

export interface SharePointList {
    /** List unique identifier */
    id: string;
    /** Display name of the list */
    displayName: string;
    /** Optional list description */
    description?: string;
    /** Number of items in the list */
    itemCount: number;
}

export interface SharePointListItem {
    /** List item unique identifier */
    id: string;
    /** Item field values */
    fields: Record<string, any>;
    /** ISO 8601 timestamp when the item was created */
    createdDateTime: string;
    /** ISO 8601 timestamp when the item was last modified */
    lastModifiedDateTime: string;
}

export interface SharePointDriveItem {
    /** Drive item unique identifier */
    id: string;
    /** Name of the file or folder */
    name: string;
    /** Size in bytes */
    size: number;
    /** Web URL for browser access */
    webUrl: string;
    /** Present if the item is a file */
    file?: {
        /** MIME type */
        mimeType: string;
    };
    /** Present if the item is a folder */
    folder?: {
        /** Number of children */
        childCount: number;
    };
    /** ISO 8601 timestamp when the item was created */
    createdDateTime: string;
}

export interface SharePointDocumentLibrary {
    /** Document library unique identifier */
    id: string;
    /** Display name of the library */
    name: string;
    /** Drive type (documentLibrary, personal, etc.) */
    driveType: string;
    /** Web URL for browser access */
    webUrl: string;
}
