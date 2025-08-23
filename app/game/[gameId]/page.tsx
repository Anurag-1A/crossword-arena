import { auth } from "@clerk/nextjs/server";
import GamePage from "@/components/GamePage";

export default async function Game({ params }: { params: { gameId: string } }) {
  const { userId } = await auth(); // ✅ fixed

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen text-xl">
        ⚠️ You must sign in to play.
      </div>
    );
  }

  return <GamePage gameId={params.gameId} />;
}
