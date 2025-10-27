import {
  BucketProvider,
  ConnectionConfig,
  SavedConnectionConfig,
} from "@/bindings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVIDERS } from "@/lib/constants";
import { useKeyringState } from "@/lib/keyring-state";
import { useCommands } from "@/lib/use-commands";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { useDashboardContext } from "./use-dashboard-context";

interface CredentialsFormProps {
  className?: string;
}

export function CredentialsForm({ className }: CredentialsFormProps) {
  const { connection, setConnection } = useDashboardContext();
  const [connectionConfig, setConnectionConfig] =
    useState<ConnectionConfig | null>(null);

  const { commands } = useCommands();
  const { setHasSavedConnections } = useKeyringState();

  const { data: savedConnections = [], refetch: refetchSavedConnections } =
    useQuery({
      queryKey: ["savedConnections"],
      queryFn: () => commands.loadSavedConnections(),
    });

  const { mutate: saveConnection } = useMutation({
    mutationFn: async (config: ConnectionConfig) => {
      return commands.saveConnection(config);
    },
    onSuccess: async () => {
      toast.success("Connection saved successfully");
      setHasSavedConnections();
      await refetchSavedConnections();
      await refetchIsConnectionConfigDuplicate();
    },
    onError: () => {
      toast.error("Failed to save connection");
    },
  });

  const { mutate: deleteConnection } = useMutation({
    mutationFn: async (uuid: string) => {
      return commands.deleteSavedConnection(uuid);
    },
    onSuccess: async () => {
      toast.success("Connection deleted successfully");
      await refetchSavedConnections();
    },
    onError: () => {
      toast.error("Failed to delete connection");
    },
  });

  function getSavedConnectionData(config: SavedConnectionConfig) {
    if ("S3" in config) {
      return config.S3;
    }

    if ("R2" in config) {
      return config.R2;
    }

    if ("Custom" in config) {
      return config.Custom;
    }

    throw new Error("Invalid saved connection config");
  }

  const providerSchema = z.literal(PROVIDERS);

  const configSchema = z
    .object({
      label: z.string().nonempty(),
      provider: providerSchema,
      accessKeyId: z.string().nonempty(),
      secretAccessKey: z.string().nonempty(),

      r2AccountId: z.string().optional(),
      endpointUrl: z.string().optional(),
    })
    .refine(
      (args) => {
        return args.provider !== "R2" || args.r2AccountId;
      },
      { path: ["r2AccountId"] },
    )
    .refine(
      (args) => {
        return args.provider !== "Custom" || args.endpointUrl;
      },
      { path: ["endpointUrl"] },
    );

  const {
    formState: { defaultValues, errors },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(configSchema),
    defaultValues: {
      provider: "S3",
    },
  });

  const { mutate, isError, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof configSchema>) => {
      const config = getConnectionConfig(data);
      const result = await commands.connectToS3(config);

      setConnection(result);
      setConnectionConfig(config);
    },
  });

  const provider = watch("provider");
  const r2AccountId = watch("r2AccountId");
  const endpointUrl = watch("endpointUrl");

  const {
    data: isConnectionConfigDuplicate = false,
    refetch: refetchIsConnectionConfigDuplicate,
  } = useQuery({
    queryKey: ["isConnectionConfigDuplicate", connectionConfig],
    queryFn: async () => {
      if (!connectionConfig) return false;

      try {
        return await commands.isConnectionDuplicate(connectionConfig);
      } catch {
        return false;
      }
    },
    enabled: !!connectionConfig,
  });

  function getConnectionConfig(
    data: z.infer<typeof configSchema>,
  ): ConnectionConfig {
    const { label, secretAccessKey, accessKeyId } = data;

    const configMap: Record<BucketProvider, () => ConnectionConfig> = {
      S3: () => {
        return {
          S3: {
            common: {
              label,
              secret_access_key: secretAccessKey,
              access_key_id: accessKeyId,
            },
          },
        };
      },

      R2: () => {
        if (!r2AccountId) {
          throw new Error("Account ID is required for R2.");
        }

        return {
          R2: {
            common: {
              label,
              secret_access_key: secretAccessKey,
              access_key_id: accessKeyId,
            },
            account_id: r2AccountId,
          },
        };
      },

      Custom: () => {
        if (!endpointUrl) {
          throw new Error("Endpoint URL is required for custom connections.");
        }

        return {
          Custom: {
            common: {
              label,
              secret_access_key: secretAccessKey,
              access_key_id: accessKeyId,
            },
            endpoint_url: endpointUrl,
          },
        };
      },
    };

    return configMap[data.provider]();
  }

  const { mutate: connectToSavedConnection, isPending: isConnectingSaved } =
    useMutation({
      mutationFn: async (config: SavedConnectionConfig) => {
        const data = getSavedConnectionData(config);
        const provider = Object.keys(config)[0] as keyof SavedConnectionConfig;
        const connectionConfig = { [provider]: data } as ConnectionConfig;

        const result = await commands.connectToS3(connectionConfig);

        setConnection(result);
        setConnectionConfig(connectionConfig);
      },
      onError: () => {
        toast.error("Failed to connect");
      },
    });

  if (connection) {
    return (
      <div className={cn("flex flex-col gap-6 p-6", className)}>
        <div>
          <h2 className="text-muted-foreground">Connection</h2>
          <div className="truncate">{connection.label}</div>
        </div>

        <div>
          <h2 className="text-muted-foreground">Provider</h2>
          <div className="truncate">{connection.provider}</div>
        </div>

        <div className="grid gap-2">
          {connectionConfig && !isConnectionConfigDuplicate && (
            <Button
              onClick={() => {
                saveConnection(connectionConfig);
              }}
              variant="outline"
            >
              Save Connection
            </Button>
          )}

          {connectionConfig && isConnectionConfigDuplicate && (
            <div className="border-muted bg-muted/50 text-muted-foreground flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm">
              Saved Connection
            </div>
          )}

          <Button
            onClick={() => {
              setConnection(null);
              setConnectionConfig(null);
              reset();
            }}
          >
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="m-4 h-fit w-full gap-6 self-center justify-self-center">
      {savedConnections.length > 0 && (
        <div className="space-y-2 border-b pb-6">
          <h3 className="text-sm font-medium">Saved Connections</h3>
          <ul className="space-y-2">
            {savedConnections.map((config) => {
              const provider = Object.keys(config)[0] as BucketProvider;
              const { common, uuid } = getSavedConnectionData(config);

              return (
                <li
                  key={uuid}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{common.label}</span>
                    <span className="text-muted-foreground text-sm">
                      {provider} • {common.access_key_id}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        connectToSavedConnection(config);
                      }}
                      disabled={isConnectingSaved}
                    >
                      Connect
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        deleteConnection(uuid);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <form
        onSubmit={handleSubmit((data) => {
          mutate(data);
        })}
        className="space-y-8"
      >
        <FormField hasError={!!errors.provider}>
          <label htmlFor="provider">Provider</label>

          <Select
            defaultValue={defaultValues?.provider}
            onValueChange={(value) => {
              const provider = value as BucketProvider;
              if (!PROVIDERS.includes(provider)) {
                console.error(`Invalid provider: ${value}`);
                return;
              }

              reset({
                provider,
                label: watch("label"),
                accessKeyId: watch("accessKeyId"),
                secretAccessKey: watch("secretAccessKey"),
              });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {PROVIDERS.map((provider) => {
                return (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <FormField.Error>Provider is required</FormField.Error>
        </FormField>

        <FormField hasError={!!errors.label}>
          <label htmlFor="label">Label</label>

          <Input
            type="text"
            id="label"
            placeholder="My Connection"
            {...register("label")}
          />

          <FormField.Error>Label is required</FormField.Error>
        </FormField>

        {provider === "R2" && (
          <FormField hasError={!!errors.r2AccountId}>
            <label htmlFor="r2AccountId">Account ID</label>

            <Input
              type="text"
              id="r2AccountId"
              placeholder="cloudflare123"
              {...register("r2AccountId")}
            />

            <FormField.Error>Account ID is required</FormField.Error>
          </FormField>
        )}

        <FormField hasError={!!errors.accessKeyId}>
          <label htmlFor="accessKeyId">Access Key Id</label>

          <Input
            type="text"
            id="accessKeyId"
            placeholder="AKIA123"
            {...register("accessKeyId")}
          />

          <FormField.Error>Access Key ID is required</FormField.Error>
        </FormField>

        <FormField hasError={!!errors.secretAccessKey}>
          <label htmlFor="secretAccessKey">Secret Access Key</label>

          <Input
            type="password"
            id="secretAccessKey"
            placeholder="supersecret123"
            {...register("secretAccessKey")}
          />

          <FormField.Error>Secret Access Key is required</FormField.Error>
        </FormField>

        {provider === "Custom" && (
          <FormField hasError={!!errors.endpointUrl}>
            <label htmlFor="endpointUrl">Endpoint URL</label>

            <Input
              type="text"
              id="endpointUrl"
              placeholder="http://localhost:4566"
              {...register("endpointUrl")}
            />

            <FormField.Error>Valid Endpoint URL is required</FormField.Error>
          </FormField>
        )}

        {isError && <p className="text-rose-500">Connection failed</p>}

        <Button type="submit" variant="outline" disabled={isPending}>
          Connect
        </Button>
      </form>
    </Card>
  );
}
