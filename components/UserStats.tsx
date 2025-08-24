"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { db } from "@/firebase/clientApp";
import { doc, onSnapshot } from "firebase/firestore";

type Stats = {
  games_played?: number;
  wins?: number;
  losses?: number;
};

export default function UserStats({ compact = false }: { compact?: boolean }) {
  const { user } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = onSnapshot(doc(db, "users", user.id), (snap) => {
      setStats((snap.data() as { stats?: Stats } | undefined)?.stats ?? null);
    });
    return () => unsub();
  }, [user?.id]);

  if (!user?.id) return <Dim>Sign in to see stats</Dim>;
  if (!stats)    return <Dim>No games yet</Dim>;

  return compact ? (
    <div className="rounded-lg border border-gray-600 p-2 text-[11px] leading-tight bg-transparent text-white">
        <div className="font-semibold mb-1">Your Stats</div>
        <ul className="space-y-1">
        <li><b>Games:</b> {stats.games_played ?? 0}</li>
        <li><b>Wins:</b> {stats.wins ?? 0}</li>
        <li><b>Losses:</b> {stats.losses ?? 0}</li>
        </ul>
    </div>
  ) : (
    <div className="rounded-xl border p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">Your Stats</h3>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Stat label="Games" value={stats.games_played ?? 0} />
        <Stat label="Wins" value={stats.wins ?? 0} />
        <Stat label="Losses" value={stats.losses ?? 0} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-gray-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function Dim({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-gray-500">{children}</div>;
}
