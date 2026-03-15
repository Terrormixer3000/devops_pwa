# HTTP-Request-Übersicht

Diese Seite dokumentiert die in der Anwendung definierten HTTP-Requests.

## Bewertungslogik

- `Kritisch = Ja`: Der Request verändert serverseitigen Zustand, entweder in Azure DevOps oder in der lokalen Push-Subscription-DB der App.
- `Kritisch = Nein`: Der Request ist rein lesend oder löst keinen persistenten Serverzustand aus.
- `Kritisch = Bedingt`: Normalerweise keine fachliche Mutation, aber es gibt relevante Seiteneffekte oder optionales Cleanup.

## Zielsysteme

- Standard-Azure-DevOps-API: `https://dev.azure.com/{organization}`
- Release-API: `https://vsrm.dev.azure.com/{organization}`
- Search-API: `https://almsearch.dev.azure.com/{organization}`
- Interne App-API: `same-origin /api/push/*`
- Demo-Modus: In `demoMode` werden externe Requests in den Service-Modulen übersprungen und durch Mock-Daten ersetzt.

## Direkte Page-Requests

| Quelle | Methode | Ziel | Verwendet für | Kritisch | Begründung |
| --- | --- | --- | --- | --- | --- |
| `src/app/settings/page.tsx` | `GET` | `/{project}/_apis/git/repositories?api-version=7.1&$top=1` | Verbindungstest in den Settings | Nein | Reiner Lesetest gegen Azure DevOps |
| `src/app/push-test/page.tsx` | `POST` | `/api/push/test` | Test-Notification für den aktuellen Browser auslösen | Nein | Keine persistente Änderung, aber aktiver Versand von Push-Nachrichten |

## Interne Push-API

| Quelle | Methode | Ziel | Verwendet für | Kritisch | Begründung |
| --- | --- | --- | --- | --- | --- |
| `pushService.registerSubscription` | `POST` | `/api/push/subscribe` | Browser-Subscription + Webhook-Token in lokaler DB registrieren oder aktualisieren | Ja | Schreibt in `data/subscriptions.json` |
| `pushService.unsubscribe` | `DELETE` | `/api/push/subscribe` | Browser-Subscription aus lokaler DB entfernen | Ja | Löscht Eintrag aus `data/subscriptions.json` |
| `push-test` | `POST` | `/api/push/test` | Test-Push an passende Subscriptions senden | Nein | Kein persistenter Fachzustand; nur Push-Versand |
| Azure DevOps Service Hook -> `src/app/api/push/webhook/route.ts` | `POST` | `/api/push/webhook?t=<token>` | Reale Azure-DevOps-Events empfangen und in Web Push übersetzen | Bedingt | Normalfall: kein persistenter Fachzustand; Nebeneffekt: abgelaufene Subscriptions werden bereinigt |

## Identity und Projekte

| Quelle | Methode | Ziel | Verwendet für | Kritisch | Begründung |
| --- | --- | --- | --- | --- | --- |
| `projectsService.listProjects` | `GET` | `/_apis/projects?api-version=7.1&$top=200` | Projekte der Organisation laden | Nein | Read-only |
| `identityService.getCurrentUser` | `GET` | `/_apis/connectionData` | Authentifizierten Azure-DevOps-User ermitteln | Nein | Read-only |
| `identityService.listTeamMembers` | `GET` | `/_apis/projects/{project}/teams?$top=1&api-version=7.1` | Default-Team für Reviewer-Auswahl laden | Nein | Read-only |
| `identityService.listTeamMembers` | `GET` | `/_apis/projects/{project}/teams/{teamId}/members?api-version=7.1` | Mitglieder des Default-Teams laden | Nein | Read-only |

## Pull Requests

| Quelle | Methode | Ziel | Verwendet für | Kritisch | Begründung |
| --- | --- | --- | --- | --- | --- |
| `pullRequestsService.listPullRequests` | `GET` | `/{project}/_apis/git/repositories/{repoId}/pullrequests?...` | PR-Liste laden | Nein | Read-only |
| `pullRequestsService.getPullRequest` | `GET` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` | PR-Details laden | Nein | Read-only |
| `pullRequestsService.getThreads` | `GET` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads?api-version=7.1` | Kommentar-Threads laden | Nein | Read-only |
| `pullRequestsService.addComment` | `POST` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads?api-version=7.1` | Neuen Top-Level-Kommentar anlegen | Ja | Erstellt PR-Kommentar-Thread |
| `pullRequestsService.vote` | `PUT` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/reviewers/{reviewerId}?api-version=7.1` | PR-Vote setzen | Ja | Ändert Reviewer-Status |
| `pullRequestsService.complete` | `PATCH` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` | PR mergen/abschließen | Ja | Ändert PR-Status und kann Branch löschen |
| `pullRequestsService.create` | `POST` | `/{project}/_apis/git/repositories/{repoId}/pullrequests?api-version=7.1` | Neuen PR erstellen | Ja | Erstellt PR |
| `pullRequestsService.getIterations` | `GET` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/iterations?api-version=7.1` | PR-Iterationen laden | Nein | Read-only |
| `pullRequestsService.getIterationChanges` | `GET` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/iterations/{iterationId}/changes?api-version=7.1` | Dateiliste einer Iteration laden | Nein | Read-only |
| `pullRequestsService.enableAutoComplete` | `PATCH` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` | Auto-Complete aktivieren | Ja | Ändert PR-Merge-Verhalten |
| `pullRequestsService.disableAutoComplete` | `PATCH` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` | Auto-Complete deaktivieren | Ja | Ändert PR-Merge-Verhalten |
| `pullRequestsService.getPolicies` | `GET` | `/{project}/_apis/policy/evaluations?artifactId=...&api-version=7.1` | Policy-Status laden | Nein | Read-only |
| `pullRequestsService.updateThreadStatus` | `PATCH` | `/{project}/_apis/git/repositories/{repoId}/pullRequests/{prId}/threads/{threadId}?api-version=7.1` | Thread öffnen/schließen/resolve | Ja | Ändert Thread-Zustand |
| `pullRequestsService.editComment` | `PATCH` | `/{project}/_apis/git/repositories/{repoId}/pullRequests/{prId}/threads/{threadId}/comments/{commentId}?api-version=7.1` | Eigenen Kommentar bearbeiten | Ja | Ändert Kommentarinhalt |
| `pullRequestsService.addReviewer` | `PUT` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/reviewers/{reviewerId}?api-version=7.1` | Reviewer hinzufügen/aktualisieren | Ja | Ändert PR-Reviewer-Liste |
| `pullRequestsService.removeReviewer` | `DELETE` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/reviewers/{reviewerId}?api-version=7.1` | Reviewer entfernen | Ja | Entfernt Reviewer |
| `pullRequestsService.replyToThread` | `POST` | `/{project}/_apis/git/repositories/{repoId}/pullRequests/{prId}/threads/{threadId}/comments?api-version=7.1` | Antwort in bestehendem Thread | Ja | Erstellt Kommentar |
| `pullRequestsService.abandonPR` | `PATCH` | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` | PR auf `abandoned` setzen | Ja | Ändert PR-Status |
| `pullRequestsService.deleteComment` | `DELETE` | `/{project}/_apis/git/repositories/{repoId}/pullRequests/{prId}/threads/{threadId}/comments/{commentId}?api-version=7.1` | Eigenen Kommentar löschen | Ja | Löscht Kommentar |

## Pipelines und Builds

| Quelle | Methode | Ziel | Verwendet für | Kritisch | Begründung |
| --- | --- | --- | --- | --- | --- |
| `pipelinesService.listPipelines` | `GET` | `/{project}/_apis/pipelines?api-version=7.1` | Pipeline-Definitionen laden | Nein | Read-only |
| `pipelinesService.listBuilds` | `GET` | `/{project}/_apis/build/builds?...` | Build-Liste laden | Nein | Read-only |
| `pipelinesService.getBuild` | `GET` | `/{project}/_apis/build/builds/{buildId}?api-version=7.1` | Build-Detail laden | Nein | Read-only |
| `pipelinesService.getBuildTimeline` | `GET` | `/{project}/_apis/build/builds/{buildId}/timeline?api-version=7.1` | Stage/Job/Step-Timeline laden | Nein | Read-only |
| `pipelinesService.getBuildLog` | `GET` | `/{project}/_apis/build/builds/{buildId}/logs/{logId}?api-version=7.1` | Build-Log laden | Nein | Read-only |
| `pipelinesService.getArtifacts` | `GET` | `/{project}/_apis/build/builds/{buildId}/artifacts?api-version=7.1` | Build-Artefakte laden | Nein | Read-only |
| `pipelinesService.queueBuild` | `POST` | `/{project}/_apis/build/builds?api-version=7.1` | Build/Run starten | Ja | Erstellt Build-Instanz |
| `pipelinesService.cancelBuild` | `PATCH` | `/{project}/_apis/build/builds/{buildId}?api-version=7.1` | Laufenden Build abbrechen | Ja | Ändert Build-Status |
| `pipelinesService.listPipelineFolders` | `GET` | `/{project}/_apis/build/folders?api-version=7.1` | Pipeline-Ordner laden | Nein | Read-only |
| `pipelinesService.getBuildDefinition` | `GET` | `/{project}/_apis/build/definitions/{definitionId}?api-version=7.1` | Build-Definition laden | Nein | Read-only |
| `pipelinesService.createPipeline` | `POST` | `/{project}/_apis/pipelines?api-version=7.1` | Neue YAML-Pipeline anlegen | Ja | Erstellt Pipeline-Definition |

## Repositories und Dateien

| Quelle | Methode | Ziel | Verwendet für | Kritisch | Begründung |
| --- | --- | --- | --- | --- | --- |
| `repositoriesService.listRepositories` | `GET` | `/{project}/_apis/git/repositories?api-version=7.1` | Repositories laden | Nein | Read-only |
| `repositoriesService.getBranches` | `GET` | `/{project}/_apis/git/repositories/{repoId}/refs?filter=heads/&api-version=7.1` | Branches laden | Nein | Read-only |
| `repositoriesService.createBranch` | `POST` | `/{project}/_apis/git/repositories/{repoId}/refs?api-version=7.1` | Neuen Branch erstellen | Ja | Erzeugt Git-Ref |
| `repositoriesService.getTags` | `GET` | `/{project}/_apis/git/repositories/{repoId}/refs?filter=tags/&api-version=7.1` | Tags laden | Nein | Read-only |
| `repositoriesService.getCommits` | `GET` | `/{project}/_apis/git/repositories/{repoId}/commits?...` | Commit-Liste laden | Nein | Read-only |
| `repositoriesService.getBranchDiff` | `GET` | `/{project}/_apis/git/repositories/{repoId}/diffs/commits?...` | Branch-Diff laden | Nein | Read-only |
| `repositoriesService.getTree` | `GET` | `/{project}/_apis/git/repositories/{repoId}/items?...` | Verzeichnisinhalt laden | Nein | Read-only |
| `repositoriesService.getFileContentAtVersion` | `GET` | `/{project}/_apis/git/repositories/{repoId}/items?...` | Dateiinhalt als Text laden | Nein | Read-only |
| `repositoriesService.getFileBinaryDataUrlAtVersion` | `GET` | `/{project}/_apis/git/repositories/{repoId}/items?...` | Bild-/Binärinhalt laden | Nein | Read-only |
| `repositoriesService.getCommitChanges` | `GET` | `/{project}/_apis/git/repositories/{repoId}/commits/{commitId}/changes?api-version=7.1` | Geänderte Dateien eines Commits laden | Nein | Read-only |
| `repositoriesService.pushFileChange` | `POST` | `/{project}/_apis/git/repositories/{repoId}/pushes?api-version=7.1` | Datei anlegen oder Inhalt committen | Ja | Erstellt Git-Push/Commit |
| `repositoriesService.deleteFile` | `POST` | `/{project}/_apis/git/repositories/{repoId}/pushes?api-version=7.1` | Datei löschen | Ja | Erstellt Git-Push/Commit |
| `repositoriesService.renameFile` | `POST` | `/{project}/_apis/git/repositories/{repoId}/pushes?api-version=7.1` | Datei umbenennen | Ja | Erstellt Git-Push/Commit |

## Releases

| Quelle | Methode | Ziel | Verwendet für | Kritisch | Begründung |
| --- | --- | --- | --- | --- | --- |
| `releasesService.listDefinitions` | `GET` | `/{project}/_apis/release/definitions?api-version=7.1` | Release-Definitionen laden | Nein | Read-only |
| `releasesService.getDefinition` | `GET` | `/{project}/_apis/release/definitions/{definitionId}?api-version=7.1` | Release-Definition laden | Nein | Read-only |
| `releasesService.listReleases` | `GET` | `/{project}/_apis/release/releases?...` | Release-Liste laden | Nein | Read-only |
| `releasesService.getRelease` | `GET` | `/{project}/_apis/release/releases/{releaseId}?api-version=7.1` | Release-Details laden | Nein | Read-only |
| `releasesService.createRelease` | `POST` | `/{project}/_apis/release/releases?api-version=7.1` | Neuen Release anlegen | Ja | Erstellt Release-Instanz |
| `releasesService.getPendingApprovals` | `GET` | `/{project}/_apis/release/approvals?api-version=7.1&statusFilter=pending` | Offene Approvals laden | Nein | Read-only |
| `releasesService.approveRelease` | `PATCH` | `/{project}/_apis/release/approvals/{approvalId}?api-version=7.1` | Release-Approval genehmigen | Ja | Ändert Approval-Status |
| `releasesService.rejectApproval` | `PATCH` | `/{project}/_apis/release/approvals/{approvalId}?api-version=7.1` | Release-Approval ablehnen | Ja | Ändert Approval-Status |
| `releasesService.getEnvironmentLogs` | `GET` | `/{project}/_apis/release/releases/{releaseId}/environments/{environmentId}/logs?api-version=7.1` | Deploy-Logs laden | Nein | Read-only |

## Work Items

| Quelle | Methode | Ziel | Verwendet für | Kritisch | Begründung |
| --- | --- | --- | --- | --- | --- |
| `workItemsService.queryMyWorkItems` | `POST` | `/{project}/_apis/wit/wiql?$top={top}&api-version=7.1` | Work Items per WIQL suchen | Nein | POST, aber reine Suchabfrage |
| `workItemsService.getWorkItemsBatch` | `GET` | `/{project}/_apis/wit/workitems?ids=...&fields=...&api-version=7.1` | Work Items im Batch laden | Nein | Read-only |
| `workItemsService.getWorkItem` | `GET` | `/{project}/_apis/wit/workitems/{id}?api-version=7.1&$expand=all` | Einzelnes Work Item laden | Nein | Read-only |
| `workItemsService.updateWorkItem` | `PATCH` | `/{project}/_apis/wit/workitems/{id}?api-version=7.1` | Work Item per JSON-Patch ändern | Ja | Ändert Work-Item-Felder |
| `workItemsService.getWorkItemComments` | `GET` | `/{project}/_apis/wit/workitems/{id}/comments?api-version=7.1` | Kommentare laden | Nein | Read-only |
| `workItemsService.addWorkItemComment` | `POST` | `/{project}/_apis/wit/workitems/{id}/comments?api-version=7.1` | Kommentar hinzufügen | Ja | Erstellt Kommentar |
| `workItemsService.createWorkItem` | `POST` | `/{project}/_apis/wit/workitems/${type}?api-version=7.1` | Neues Work Item anlegen | Ja | Erstellt Work Item |
| `workItemsService.listIterations` | `GET` | `/{project}/_apis/work/teamsettings/iterations?api-version=7.1` | Sprints/Iterationen laden | Nein | Read-only |

## Suche

| Quelle | Methode | Ziel | Verwendet für | Kritisch | Begründung |
| --- | --- | --- | --- | --- | --- |
| `searchService.searchCode` | `POST` | `/_apis/search/codesearchresults?api-version=7.1` | Code-Suche im Repository | Nein | POST, aber reine Suchabfrage |

## Hinweise

- `POST` bedeutet in dieser App nicht automatisch `kritisch`. Beispiele ohne persistente Mutation: WIQL-Suche, Code-Suche, Push-Test.
- Kritische Requests liegen fast ausschließlich in den Domain-Services unter `src/lib/services/` und in der internen Push-Subscription-API.
- Die tatsächliche Ausführung hängt oft am Demo-Modus: Ist der Client als Demo-Client markiert, werden externe Requests in vielen Services gar nicht gesendet.
