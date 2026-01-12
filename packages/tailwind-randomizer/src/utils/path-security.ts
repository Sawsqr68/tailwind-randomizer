import path from "path";

/**
 * Securely resolves a file path within the project directory to prevent path traversal attacks.
 * 
 * @param relativePath - The relative path from the project root
 * @returns The absolute, validated path
 * @throws Error if path traversal is detected
 */
export function getSecureFilePath(relativePath: string): string {
  const cwd = path.resolve(process.cwd());
  const filePath = path.resolve(cwd, relativePath);
  
  // Use path.relative to check if the path escapes the working directory
  const relativeToBase = path.relative(cwd, filePath);
  
  // Ensure the path doesn't start with '..' (escaping parent directory)
  if (relativeToBase.startsWith('..')) {
    throw new Error(`Invalid file path: path traversal detected (${relativePath})`);
  }
  
  return filePath;
}
