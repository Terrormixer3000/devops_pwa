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
import { IdentityRef } from "@/types";

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

const DEMO_TEAM_MEMBERS: IdentityRef[] = [
  { id: "demo-user-1", displayName: "Anna Schmidt", uniqueName: "anna.schmidt@demo.com" },
  { id: "demo-user-2", displayName: "Markus Weber", uniqueName: "markus.weber@demo.com" },
  { id: "demo-user-3", displayName: "Julia Fischer", uniqueName: "julia.fischer@demo.com" },
  { id: "demo-user-4", displayName: "Thomas Mueller", uniqueName: "thomas.mueller@demo.com" },
  { id: "demo-user-5", displayName: "Sabine Braun", uniqueName: "sabine.braun@demo.com" },
  { id: "demo-user-6", displayName: "Michael Hoffmann", uniqueName: "michael.hoffmann@demo.com" },
  { id: "demo-user-7", displayName: "Lisa Wagner", uniqueName: "lisa.wagner@demo.com" },
  { id: "demo-user-8", displayName: "Stefan Becker", uniqueName: "stefan.becker@demo.com" },
];

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

  /**
   * Gibt Team-Mitglieder des Default-Teams im Projekt zurueck.
   * Nutzt den Teams-Endpunkt um das Default-Team zu ermitteln und dessen Members abzufragen.
   */
  async listTeamMembers(client: AxiosInstance, project: string): Promise<IdentityRef[]> {
    if (isDemoClient(client)) return DEMO_TEAM_MEMBERS;

    try {
      // Teams des Projekts laden (Default-Team wird zuerst aufgelistet)
      const teamsRes = await client.get<{ value: { id: string; name: string }[] }>(
        `/_apis/projects/${project}/teams?$top=1&api-version=7.1`
      );
      const teamId = teamsRes.data.value[0]?.id;
      if (!teamId) return [];

      // Team-Mitglieder laden
      const membersRes = await client.get<{ value: { identity: IdentityRef }[] }>(
        `/_apis/projects/${project}/teams/${teamId}/members?api-version=7.1`
      );
      return membersRes.data.value.map((m) => m.identity);
    } catch {
      return [];
    }
  },
};
