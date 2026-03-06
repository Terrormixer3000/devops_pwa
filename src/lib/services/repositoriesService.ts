import { AxiosInstance } from "axios";
import { Repository, Branch, Commit, TreeEntry, AzureListResponse } from "@/types";

export const repositoriesService = {
  async listRepositories(client: AxiosInstance, project: string): Promise<Repository[]> {
    const res = await client.get<AzureListResponse<Repository>>(
      `/${project}/_apis/git/repositories?api-version=7.1`
    );
    return res.data.value;
  },

  async getBranches(client: AxiosInstance, project: string, repoId: string): Promise<Branch[]> {
    const res = await client.get<AzureListResponse<Branch>>(
      `/${project}/_apis/git/repositories/${repoId}/refs?filter=heads/&api-version=7.1`
    );
    return res.data.value.map((b) => ({
      ...b,
      name: b.name.replace("refs/heads/", ""),
    }));
  },

  async getCommits(
    client: AxiosInstance,
    project: string,
    repoId: string,
    branch: string,
    top = 30
  ): Promise<Commit[]> {
    const res = await client.get<AzureListResponse<Commit>>(
      `/${project}/_apis/git/repositories/${repoId}/commits?searchCriteria.itemVersion.version=${encodeURIComponent(branch)}&$top=${top}&api-version=7.1`
    );
    return res.data.value;
  },

  async getTree(
    client: AxiosInstance,
    project: string,
    repoId: string,
    branch: string,
    path = "/"
  ): Promise<TreeEntry[]> {
    const version = encodeURIComponent(branch);
    const scopePath = encodeURIComponent(path);
    const res = await client.get<AzureListResponse<TreeEntry>>(
      `/${project}/_apis/git/repositories/${repoId}/items?scopePath=${scopePath}&versionDescriptor.version=${version}&recursionLevel=oneLevel&api-version=7.1`
    );
    return res.data.value.filter((item) => item.path !== path);
  },

  async getFileContent(
    client: AxiosInstance,
    project: string,
    repoId: string,
    path: string,
    branch: string
  ): Promise<string> {
    const res = await client.get(
      `/${project}/_apis/git/repositories/${repoId}/items?path=${encodeURIComponent(path)}&versionDescriptor.version=${encodeURIComponent(branch)}&api-version=7.1`,
      { responseType: "text", headers: { Accept: "text/plain" } }
    );
    return res.data;
  },
};
