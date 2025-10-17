const keys = {
  HAS_SAVED_CONNECTIONS: "nicebucket_has_saved_connections",
} as const;

export function useKeyringState() {
  const hasSavedConnections =
    localStorage.getItem(keys.HAS_SAVED_CONNECTIONS) === "true";

  const setHasSavedConnections = () => {
    localStorage.setItem(keys.HAS_SAVED_CONNECTIONS, "true");
  };

  return {
    hasSavedConnections,
    setHasSavedConnections,
  };
}
