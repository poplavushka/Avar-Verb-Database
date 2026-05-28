const repoUrl = import.meta.env.VITE_REPO_URL?.trim() ?? "";
const repoBranch = import.meta.env.VITE_REPO_BRANCH?.trim() || "main";

export const appConfig = {
  title: "Avar Verbal Database",
  baseUrl: import.meta.env.BASE_URL,
  repositoryUrl: repoUrl,
  repositoryBranch: repoBranch,
  localCsvUrl: `${import.meta.env.BASE_URL}data/verbal_database.csv`,
  localDatasetUrl: `${import.meta.env.BASE_URL}data/verbal_database.json`,
};

export function getGithubCsvUrl(): string | null {
  if (!repoUrl) {
    return null;
  }

  return `${repoUrl}/blob/${repoBranch}/public/data/verbal_database.csv`;
}
