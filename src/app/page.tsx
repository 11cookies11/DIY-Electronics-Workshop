import { LabExperience } from "@/components/lab/LabExperience";
import { fetchSecondMe, getSecondMeConnectionState } from "@/lib/secondme";

type HomeProps = {
  searchParams?: Promise<{
    connected?: string;
    error?: string;
  }>;
};

type UserInfo = Record<string, unknown>;

export default async function Home({ searchParams }: HomeProps) {
  const params = (await searchParams) ?? {};
  const connected = params.connected === "1";
  const error = params.error;
  const connectionState = await getSecondMeConnectionState();
  const isConnected = connectionState.isConnected;
  let userInfo: UserInfo | null = null;
  let userInfoError: string | null = null;

  if (isConnected) {
    try {
      userInfo = await fetchSecondMe<UserInfo>("/api/secondme/user/info");
    } catch (fetchError) {
      userInfoError =
        fetchError instanceof Error ? fetchError.message : "获取用户资料失败";
    }
  }

  return (
    <LabExperience
      isConnected={isConnected}
      connectedFromCallback={connected}
      error={error}
      userInfo={userInfo}
      userInfoError={userInfoError}
    />
  );
}
