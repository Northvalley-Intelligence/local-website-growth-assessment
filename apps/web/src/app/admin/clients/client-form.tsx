import { DAYS, type ClientRecord } from "../../../lib/client-record";

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday"
};

function Text(props: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="client-field">
      <span>{props.label}</span>
      <input
        name={props.name}
        defaultValue={props.value ?? ""}
        required={props.required}
        autoComplete="off"
      />
      {props.hint ? <small>{props.hint}</small> : null}
    </label>
  );
}

export function ClientForm({
  client,
  action
}: {
  client?: ClientRecord;
  action: string;
}) {
  return (
    <form className="scan-form client-form" method="post" action={action}>
      <h2>Business</h2>
      <Text
        name="displayName"
        label="Display name"
        value={client?.displayName}
        required
      />
      <Text name="legalName" label="Legal name" value={client?.legalName} />
      <Text
        name="primaryCategory"
        label="Primary category"
        value={client?.primaryCategory}
      />
      <Text
        name="additionalCategories"
        label="Additional categories (comma separated)"
        value={client?.additionalCategories.join(", ")}
      />
      <Text name="phone" label="Phone" value={client?.phone} />
      <Text name="website" label="Website" value={client?.website} />
      <Text
        name="socialWebsite"
        label="Social page (used when there is no website)"
        value={client?.socialWebsite}
      />
      <Text name="description" label="About" value={client?.description} />
      <Text name="logoUrl" label="Logo URL" value={client?.logoUrl} />
      <Text
        name="coverPhotoUrl"
        label="Cover photo URL"
        value={client?.coverPhotoUrl}
      />
      <Text
        name="googleProfileUrl"
        label="Google profile URL"
        value={client?.googleProfileUrl}
        hint="https://share.google/… or https://www.google.com/maps/…"
      />

      <h2>Address</h2>
      <Text name="address.line1" label="Street address" value={client?.address.line1} />
      <Text name="address.line2" label="Suite / unit" value={client?.address.line2} />
      <Text name="address.city" label="City" value={client?.address.city} />
      <Text
        name="address.region"
        label="State / region"
        value={client?.address.region}
      />
      <Text
        name="address.postalCode"
        label="Postal code"
        value={client?.address.postalCode}
      />
      <Text
        name="lat"
        label="Latitude"
        value={client?.coordinates ? String(client.coordinates.lat) : ""}
      />
      <Text
        name="lng"
        label="Longitude"
        value={client?.coordinates ? String(client.coordinates.lng) : ""}
      />
      <label className="client-field">
        <span>Address on listings</span>
        <select
          name="addressPublication"
          defaultValue={client?.addressPublication ?? "publish"}
        >
          <option value="publish">Publish</option>
          <option value="hide">Hide</option>
        </select>
      </label>
      <label className="client-field">
        <span>Storefront</span>
        <select
          name="storefrontStatus"
          defaultValue={client?.storefrontStatus ?? "physical"}
        >
          <option value="physical">Physical location</option>
          <option value="service_area">Service-area business</option>
        </select>
      </label>
      <Text
        name="serviceAreas"
        label="Service areas (comma separated)"
        value={client?.serviceAreas.join(", ")}
      />

      <h2>Hours</h2>
      <div className="hours-grid">
        {DAYS.map((d) => {
          const h = client?.hours[d];
          return (
            <div key={d} className="hours-row">
              <strong>{DAY_LABELS[d]}</strong>
              <select name={`hours.${d}.kind`} defaultValue={h?.kind ?? ""}>
                <option value="">Not set</option>
                <option value="closed">Closed</option>
                <option value="open24">Open 24 hours</option>
                <option value="ranges">Open</option>
              </select>
              <input
                type="time"
                name={`hours.${d}.open`}
                defaultValue={h?.ranges[0]?.open ?? ""}
                aria-label={`${DAY_LABELS[d]} opens`}
              />
              <input
                type="time"
                name={`hours.${d}.close`}
                defaultValue={h?.ranges[0]?.close ?? ""}
                aria-label={`${DAY_LABELS[d]} closes`}
              />
            </div>
          );
        })}
      </div>

      <Text name="notes" label="Notes" value={client?.notes} />
      <button type="submit">{client ? "Save client" : "Create client"}</button>
    </form>
  );
}
