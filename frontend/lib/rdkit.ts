interface RDKitResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function matchSmart(smarts: string, mol_Data: string): Promise<RDKitResult> {
  try {
    const response = await fetch("/api/rdkit/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ smarts, mol_Data }),
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