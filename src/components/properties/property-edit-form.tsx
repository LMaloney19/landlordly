"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BedroomsSelect } from "@/components/properties/bedrooms-select";
import { bedroomsFromFormValue, bedroomsToFormValue } from "@/lib/bedrooms";
import { signedOutSaveMessage } from "@/lib/dev-bypass";
import {
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  US_STATES,
  type PropertyRow,
} from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/types";

type PropertyEditFormProps = {
  property: Property;
  onUpdated: (property: Property) => void;
  onCancel: () => void;
};

type UnitEntry = {
  label: string;
  bedrooms: string;
  rent: string;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60";

function buildUnitEntries(count: number, previous: UnitEntry[]): UnitEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    label: previous[i]?.label ?? (count === 1 ? "1" : ""),
    bedrooms: previous[i]?.bedrooms ?? "2",
    rent: previous[i]?.rent ?? previous[0]?.rent ?? "",
  }));
}

export function PropertyEditForm({
  property,
  onUpdated,
  onCancel,
}: PropertyEditFormProps) {
  const [addressLine1, setAddressLine1] = useState(property.addressLine1);
  const [city, setCity] = useState(property.city);
  const [state, setState] = useState(property.state);
  const [postalCode, setPostalCode] = useState(property.postalCode);
  const country = property.country;
  const [unitCount, setUnitCount] = useState(property.unitCount);
  const [unitEntries, setUnitEntries] = useState<UnitEntry[]>(
    property.units.map((unit) => ({
      label: unit.unitLabel,
      bedrooms: bedroomsToFormValue(unit.bedrooms),
      rent: String(unit.monthlyRent),
    })),
  );
  const [sameRentForAll, setSameRentForAll] = useState(false);
  const [defaultRent, setDefaultRent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setUnitEntries((prev) => buildUnitEntries(unitCount, prev));
  }, [unitCount]);

  useEffect(() => {
    if (!sameRentForAll) return;
    setUnitEntries((prev) =>
      prev.map((entry) => ({ ...entry, rent: defaultRent })),
    );
  }, [defaultRent, sameRentForAll]);

  function updateUnitEntry(index: number, patch: Partial<UnitEntry>) {
    setUnitEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    if (!addressLine1.trim()) {
      setError("Street address is required.");
      setIsPending(false);
      return;
    }
    if (!city.trim() || !state || !postalCode.trim()) {
      setError("City, state, and ZIP are required.");
      setIsPending(false);
      return;
    }

    const parsedUnits = unitEntries.map((entry, index) => {
      const rent = Number(sameRentForAll ? defaultRent : entry.rent);
      const bedrooms = bedroomsFromFormValue(entry.bedrooms);
      const label =
        entry.label.trim() || (unitCount === 1 ? "1" : `Unit ${index + 1}`);
      return { label, rent, bedrooms };
    });

    for (const unit of parsedUnits) {
      if (!unit.label) {
        setError("Each apartment needs a unit number or label.");
        setIsPending(false);
        return;
      }
      if (unit.bedrooms === null) {
        setError("Choose bedrooms or Studio for each apartment.");
        setIsPending(false);
        return;
      }
      if (!Number.isFinite(unit.rent) || unit.rent <= 0) {
        setError("Each unit needs a monthly rent greater than 0.");
        setIsPending(false);
        return;
      }
    }

    const labels = parsedUnits.map((u) => u.label.toLowerCase());
    if (new Set(labels).size !== labels.length) {
      setError("Apartment numbers must be unique within this building.");
      setIsPending(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(signedOutSaveMessage());
      setIsPending(false);
      return;
    }

    const { error: propertyError } = await supabase
      .from("properties")
      .update({
        address_line1: addressLine1.trim(),
        address_line2: null,
        city: city.trim(),
        state,
        postal_code: postalCode.trim(),
        country: country.trim() || "US",
      })
      .eq("id", property.id)
      .eq("user_id", user.id);

    if (propertyError) {
      setError(propertyError.message);
      setIsPending(false);
      return;
    }

    const { error: deleteUnitsError } = await supabase
      .from("property_units")
      .delete()
      .eq("property_id", property.id)
      .eq("user_id", user.id);

    if (deleteUnitsError) {
      setError(deleteUnitsError.message);
      setIsPending(false);
      return;
    }

    const { error: unitsError } = await supabase.from("property_units").insert(
      parsedUnits.map((unit) => ({
        user_id: user.id,
        property_id: property.id,
        unit_label: unit.label,
        bedrooms: unit.bedrooms as number,
        monthly_rent: unit.rent,
      })),
    );

    if (unitsError) {
      setError(unitsError.message);
      setIsPending(false);
      return;
    }

    const { data: fullProperty, error: fetchError } = await supabase
      .from("properties")
      .select(PROPERTY_WITH_UNITS_SELECT)
      .eq("id", property.id)
      .single();

    if (fetchError || !fullProperty) {
      setError(fetchError?.message ?? "Property saved but could not reload.");
      setIsPending(false);
      return;
    }

    onUpdated(rowToProperty(fullProperty as PropertyRow));
    setIsPending(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-md border border-zinc-200 bg-zinc-50/80 p-4"
    >
      <fieldset className="space-y-4" disabled={isPending}>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">
            Street address
          </span>
          <input
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">City</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">State</span>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={inputClass}
            >
              <option value="">Select</option>
              {US_STATES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">ZIP</span>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">How many units?</span>
          <input
            type="number"
            min={1}
            max={100}
            value={unitCount}
            onChange={(e) =>
              setUnitCount(Math.max(1, Number(e.target.value) || 1))
            }
            className={inputClass}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={sameRentForAll}
            onChange={(e) => setSameRentForAll(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Same monthly rent for every unit
        </label>

        {sameRentForAll ? (
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">
              Monthly rent (each unit)
            </span>
            <input
              type="number"
              min={1}
              value={defaultRent}
              onChange={(e) => setDefaultRent(e.target.value)}
              className={inputClass}
            />
          </label>
        ) : null}

        <ul className="space-y-3">
          {unitEntries.map((entry, index) => (
            <li key={index} className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-medium text-zinc-600">
                  Apartment {index + 1}
                </span>
                <input
                  type="text"
                  value={entry.label}
                  onChange={(e) =>
                    updateUnitEntry(index, { label: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-600">
                  Bedrooms
                </span>
                <BedroomsSelect
                  value={entry.bedrooms}
                  onChange={(bedrooms) =>
                    updateUnitEntry(index, { bedrooms })
                  }
                  className={inputClass}
                />
              </label>
              {!sameRentForAll ? (
                <label className="block">
                  <span className="text-xs font-medium text-zinc-600">
                    Monthly rent
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={entry.rent}
                    onChange={(e) =>
                      updateUnitEntry(index, { rent: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      </fieldset>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-white disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
