import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Error handler
export const handleError = (error: unknown) => {
  if (error instanceof Error) {
    // Native JavaScript Error
    console.error(error.message);
    throw new Error(`Error: ${error.message}`);
  } else if (typeof error === "string") {
    // String error
    console.error(error);
    throw new Error(`Error: ${error}`);
  } else {
    // Unknown error type
    console.error(error);
    throw new Error(`Unknwon error: ${JSON.stringify(error)}`);
  }
};
