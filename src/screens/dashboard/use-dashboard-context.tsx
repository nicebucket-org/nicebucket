import { BucketInfo, Connection, ObjectInfo } from "@/bindings";
import { useKeyringState } from "@/lib/keyring-state";
import { useCommands } from "@/lib/use-commands";
import { useQuery } from "@tanstack/react-query";
import { createContext, ReactNode, useContext, useState } from "react";

interface DashboardContextOptions {
  connection: Connection | null;
  setConnection: (connection: Connection | null) => void;

  selectedBucket: BucketInfo | null;
  setSelectedBucket: (bucket: BucketInfo | null) => void;

  prefix: string | null;
  setPrefix: (bucket: string | null) => void;

  previewedObject: ObjectInfo | null;
  setPreviewedObject: (bucket: ObjectInfo | null) => void;

  searchPhrase: string;
  setSearchPhrase: (searchPhrase: string) => void;

  savedConnectionsLoading: boolean;
}

const DashboardContext = createContext<DashboardContextOptions | undefined>(
  undefined,
);

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [selectedBucket, _setSelectedBucket] = useState<BucketInfo | null>(
    null,
  );
  const [prefix, setPrefix] = useState<string | null>(null);
  const [previewedObject, setPreviewedObject] = useState<ObjectInfo | null>(
    null,
  );

  const [searchPhrase, setSearchPhrase] = useState("");

  const { commands } = useCommands();
  const { hasSavedConnections } = useKeyringState();

  const { isLoading: savedConnectionsLoading } = useQuery({
    queryKey: ["savedConnections"],
    queryFn: () => commands.loadSavedConnections(),
    enabled: hasSavedConnections,
  });

  /**
   * When changing buckets we always want to display the root contents.
   */
  function setSelectedBucket(bucket: BucketInfo | null) {
    _setSelectedBucket(bucket);
    setPrefix(null);
  }

  const contextValue: DashboardContextOptions = {
    connection,
    setConnection,
    selectedBucket,
    setSelectedBucket,
    prefix,
    setPrefix,
    previewedObject,
    setPreviewedObject,
    searchPhrase,
    setSearchPhrase,
    savedConnectionsLoading,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error(
      "useDashboardContext must be used within <DashboardProvider />",
    );
  }

  return context;
}
