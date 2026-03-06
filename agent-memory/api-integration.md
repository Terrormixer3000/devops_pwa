# Azure DevOps API Integration

## Authentifizierung
- Methode: Basic Authentication
- Token: Base64(`:PAT`) – kein Benutzername, nur PAT
- Header: `Authorization: Basic <base64(:PAT)>`
- API-Version: `7.1` (in allen Requests)

## Hosts
- **Standard-API:** `https://dev.azure.com/{organisation}`
- **Release-API:** `https://vsrm.dev.azure.com/{organisation}` (wichtig!)

## Endpoints

### Repositories
```
GET /{project}/_apis/git/repositories?api-version=7.1
GET /{project}/_apis/git/repositories/{repoId}/refs?filter=heads/&api-version=7.1
GET /{project}/_apis/git/repositories/{repoId}/commits?searchCriteria.itemVersion.version={branch}&$top=30
GET /{project}/_apis/git/repositories/{repoId}/items?scopePath={path}&versionDescriptor.version={branch}&recursionLevel=oneLevel
GET /{project}/_apis/git/repositories/{repoId}/items?path={path}&versionDescriptor.version={branch}  (Accept: text/plain)
```

### Pull Requests
```
GET  /{project}/_apis/git/repositories/{repoId}/pullrequests?searchCriteria.status={status}&$top=50
GET  /{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}
GET  /{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads
POST /{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads
PUT  /{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/reviewers/{reviewerId}  (vote)
PATCH /{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}  (complete/status)
POST /{project}/_apis/git/repositories/{repoId}/pullrequests  (create)
GET  /{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/iterations
GET  /{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/iterations/{id}/changes
```

### Pipelines / Builds
```
GET  /{project}/_apis/pipelines?api-version=7.1
GET  /{project}/_apis/build/builds?definitions={id}&$top=20
GET  /{project}/_apis/build/builds/{buildId}
GET  /{project}/_apis/build/builds/{buildId}/timeline
GET  /{project}/_apis/build/builds/{buildId}/logs/{logId}  (Accept: text/plain)
GET  /{project}/_apis/build/builds/{buildId}/artifacts
POST /{project}/_apis/build/builds  (queue)
PATCH /{project}/_apis/build/builds/{buildId}  (cancel: status=cancelling)
```

### Releases (VSRM Host!)
```
GET  /{project}/_apis/release/definitions?api-version=7.1
GET  /{project}/_apis/release/definitions/{id}
GET  /{project}/_apis/release/releases?definitionId={id}&$top=20
GET  /{project}/_apis/release/releases/{releaseId}
POST /{project}/_apis/release/releases  (create release)
GET  /{project}/_apis/release/approvals?statusFilter=pending
PATCH /{project}/_apis/release/approvals/{approvalId}  (approve/reject)
```

## Paging
- `$top` Parameter für Seitengrösse
- Weitere Seiten: `continuationToken` Header in Response
- Aktuell: einfaches Top-N implementiert (MVP)

## Fehlerbehandlung
- 401 → Unauthorized (PAT ungültig)
- 403 → Forbidden (fehlende Berechtigungen)
- 404 → Not found
- Alle anderen → Generischer Fehler mit Meldung aus response.data.message

## Modelle
Alle TypeScript-Typen in `src/types/index.ts` definiert.

## Besonderheiten
- Branches kommen als `refs/heads/{name}` – muss für Anzeige gekürzt werden
- Release API nutzt anderen Host (vsrm.dev.azure.com)
- Build-Logs: `Accept: text/plain` Header nötig
- Dateiinhalt: `Accept: text/plain` + `responseType: "text"` in Axios
- PR Vote: 10=Approve, 5=ApproveWithSuggestions, -5=WaitForAuthor, -10=Reject
