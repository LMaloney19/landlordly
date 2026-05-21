"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PropertyForm } from "@/components/properties/property-form";
import { PropertyList } from "@/components/properties/property-list";
import { hasDevBypass } from "@/lib/dev-bypass";
import {
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/types";

type PropertiesPageProps = {
  initialProperties: Property[];
  loadError: string | null;
};

export function PropertiesPage({
  initialProperties,
  loadError,
}: PropertiesPageProps) {
  const [properties, setProperties] = useState(initialProperties);
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (hasDevBypass()) {
          setClientLoadError(null);
          setProperties([]);
          return;
        }
        setClientLoadError("Sign in to load your saved properties.");
        return;
      }

      const { data, error } = await supabase
        .from("properties")
        .select(PROPERTY_WITH_UNITS_SELECT)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setClientLoadError(error.message);
        return;
      }

      setClientLoadError(null);
      setProperties(
        (data as PropertyRow[])
          .filter((property) => !property.archived_at)
          .map(rowToProperty),
      );
    }

    void loadProperties();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Properties"
        description="Manage addresses, units, and monthly rent for your portfolio."
      />

      {loadError || clientLoadError ? (
        <p
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {loadError === "Not authenticated." ? (
            <>
              Session expired.{" "}
              <a href="/login" className="font-medium underline">
                Sign in again
              </a>
              .
            </>
          ) : (
            (clientLoadError ?? loadError)
          )}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <PropertyForm
          onCreated={(property) =>
            setProperties((current) => [property, ...current])
          }
        />
        <PropertyList
          properties={properties}
          onDeleted={(id) =>
            setProperties((current) => current.filter((p) => p.id !== id))
          }
          onUpdated={(property) =>
            setProperties((current) =>
              current.map((p) => (p.id === property.id ? property : p)),
            )
          }
        />
      </section>
    </>
  );
}
