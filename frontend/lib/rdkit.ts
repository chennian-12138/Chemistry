interface RDKitResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function matchSmart(smarts: string, molBlock: string): Promise<RDKitResult> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/rdkit/match-smarts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ smarts, molBlock }),
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("RDKit match error:", error);
    return {
      success: false,
      error: error.message || "Failed to match SMARTS",
    };
  }
}