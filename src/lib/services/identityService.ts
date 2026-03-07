/**
 * Identity Service
 *
 * Ermittelt die Azure DevOps User-ID des PAT-Inhabers ueber den
 * /_apis/connectionData Endpunkt. Dieser Endpunkt gibt immer den
 * authentifizierten User zurueck — unabhaengig von Org oder Projekt.
 *
 * Die zurueckgegebene ID ist eine stabile GUID, die in Azure DevOps
 * Service Hook Payloads als Reviewer-ID, Approver-ID etc. auftaucht.
 */

import { AxiosInstance } from "axios";
import { isDemoClient } from "@/lib/api/client";

export interface AzureCurrentUser {
  /** Stabile GUID — entspricht den IDs in Service Hook Payloads */
  id: string;
  displayName: string;
  uniqueName: string;
}

interface ConnectionData {
  authenticatedUser: {
    id: string;
    providerDisplayName: string;
    subjectDescriptor?: string;
    properties?: {
      Account?: { $value?: string };
    };
  };
}

const DEMO_USER: AzureCurrentUser = {
  id: "demo-user-00000000-0000-0000-0000-000000000001",
  displayName: "Demo User",
  uniqueName: "demo@example.com",
};

export const identityService = {
  /**
   * Gibt die Azure DevOps User-ID des PAT-Inhabers zurueck.
   * Wirft einen ApiError wenn die Verbindung fehlschlaegt.
   */
  async getCurrentUser(client: AxiosInstance): Promise<AzureCurrentUser> {
    if (isDemoClient(client)) return DEMO_USER;

    const response = await client.get<ConnectionData>(
      "/_apis/connectionData"
    );

    const user = response.data.authenticatedUser;
    return {
      id: user.id,
      displayName: user.providerDisplayName,
      uniqueName: user.properties?.Account?.$value ?? user.providerDisplayName,
    };
  },
};
