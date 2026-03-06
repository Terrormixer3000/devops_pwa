import axios, { AxiosInstance, AxiosError } from "axios";
import { AppSettings, AzureListResponse } from "@/types";

// Benutzerdefinierter Fehlertyp fuer API-Fehler
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Erstellt einen Axios-Client fuer die Azure DevOps Standard-API
export function createAzureClient(settings: AppSettings): AxiosInstance {
  // PAT Base64-kodieren (kein Benutzername, nur Token)
  const token = btoa(`:${settings.pat}`);
  const client = axios.create({
    baseURL: `https://dev.azure.com/${settings.organization}`,
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    },
  });

  // Fehler-Interceptor: HTTP-Statuscodes in lesbare Fehlermeldungen umwandeln
  client.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
      const status = error.response?.status;
      if (status === 401) throw new ApiError("Nicht autorisiert: PAT-Token ueberpruefen", 401);
      if (status === 403) throw new ApiError("Zugriff verweigert: unzureichende Berechtigungen", 403);
      if (status === 404) throw new ApiError("Nicht gefunden", 404);
      const message = (error.response?.data as { message?: string })?.message || error.message;
      throw new ApiError(message, status);
    }
  );

  return client;
}

// Erstellt einen Axios-Client fuer die Azure DevOps Release-API (anderer Host!)
export function createVsrmClient(settings: AppSettings): AxiosInstance {
  const token = btoa(`:${settings.pat}`);
  return axios.create({
    baseURL: `https://vsrm.dev.azure.com/${settings.organization}`,
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export type { AzureListResponse };
