"use client";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  return (
    <nav className="w-full bg-gray-900 text-white p-4 flex justify-between">
      <h2 className="text-xl font-bold">Crossword Battle</h2>

      <div>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="bg-blue-500 px-4 py-2 rounded-lg hover:bg-blue-600">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  );
}

            