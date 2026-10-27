import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const listingOverrides = sqliteTable("listing_overrides", {
  id: integer("id").primaryKey(), name: text("name").notNull(), building: text("building").notNull().default(""), price: integer("price").notNull(), monthlyPrice: integer("monthly_price").notNull().default(0), usdNightly: integer("usd_nightly").notNull().default(0), usdMonthly: integer("usd_monthly").notNull().default(0), description: text("description").notNull(), active: integer("active").notNull(),
});
export const inquiries = sqliteTable("inquiries", {
  id: integer("id").primaryKey({ autoIncrement: true }), apartmentId: integer("apartment_id").notNull(), name: text("name").notNull(), email: text("email").notNull(), phone: text("phone").notNull().default(""), channel: text("channel").notNull().default("email"), requestId: text("request_id"), telegramStatus: text("telegram_status").notNull().default("not_applicable"), checkIn: text("check_in").notNull(), checkOut: text("check_out").notNull(), guests: integer("guests").notNull(), message: text("message").notNull(), status: text("status").notNull(), createdAt: text("created_at").notNull(),
});
export const inquiryRateLimits = sqliteTable("inquiry_rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(),
});

export const roomDetails = sqliteTable("room_details", { id: integer("id").primaryKey(), amenities: text("amenities").notNull(), sqm: integer("sqm").notNull(), beds: text("beds").notNull(), wifi: text("wifi").notNull(), address: text("address").notNull().default(""), area: text("area").notNull().default(""), view: text("view").notNull().default(""), guests: integer("guests").notNull().default(2), availableUnits: integer("available_units"), isCustom: integer("is_custom").notNull().default(0) });
export const roomImages = sqliteTable("room_images", { id: integer("id").primaryKey({ autoIncrement: true }), apartmentId: integer("apartment_id").notNull(), mime: text("mime").notNull(), imageData: text("image_data").notNull(), alt: text("alt").notNull().default(""), position: integer("position").notNull().default(0) });

export const catalogBuildings = sqliteTable("catalog_buildings", {
  sourceId: text("source_id").primaryKey(),
  published: integer("published").notNull().default(0),
  description: text("description").notNull().default(""),
  address: text("address").notNull().default(""),
  services: text("services").notNull().default("[]"),
});
export const catalogRooms = sqliteTable("catalog_rooms", {
  sourceId: text("source_id").primaryKey(),
  buildingSourceId: text("building_source_id").notNull().default(""),
  published: integer("published").notNull().default(0),
  description: text("description").notNull().default(""),
  nightlyPrice: integer("nightly_price").notNull().default(0),
  monthlyPrice: integer("monthly_price").notNull().default(0),
  services: text("services").notNull().default("[]"),
});
export const catalogImages = sqliteTable("catalog_images", {
  id: text("id").primaryKey(),
  ownerType: text("owner_type").notNull(),
  ownerId: text("owner_id").notNull(),
  objectKey: text("object_key").notNull(),
  mime: text("mime").notNull(),
  alt: text("alt").notNull().default(""),
  position: integer("position").notNull().default(0),
});
export const catalogInquiries = sqliteTable("catalog_inquiries", {
  id: text("id").primaryKey(),
  sourceRoomId: text("source_room_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  checkIn: text("check_in").notNull().default(""),
  checkOut: text("check_out").notNull().default(""),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
});

export const partnerInquiries = sqliteTable("partner_inquiries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  property: text("property").notNull().default(""),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
});

export const siteContentItems = sqliteTable("site_content_items", {
  id: text("id").primaryKey(),
  section: text("section").notNull(),
  titleVi: text("title_vi").notNull().default(""),
  titleEn: text("title_en").notNull().default(""),
  bodyVi: text("body_vi").notNull().default(""),
  bodyEn: text("body_en").notNull().default(""),
  published: integer("published").notNull().default(1),
  deleted: integer("deleted").notNull().default(0),
  position: integer("position").notNull().default(0),
});

export const landmarks = sqliteTable("landmarks", {
  id: text("id").primaryKey(),
  nameVi: text("name_vi").notNull(),
  nameEn: text("name_en").notNull().default(""),
  descriptionVi: text("description_vi").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  latitude: real("latitude"),
  longitude: real("longitude"),
  buildingIdsJson: text("building_ids_json").notNull().default("[]"),
  published: integer("published").notNull().default(1),
  deleted: integer("deleted").notNull().default(0),
  position: integer("position").notNull().default(0),
});

export const travelTimeCache = sqliteTable("travel_time_cache", {
  buildingId: text("building_id").notNull(),
  landmarkId: text("landmark_id").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  distanceMeters: integer("distance_meters").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [primaryKey({ columns: [table.buildingId, table.landmarkId] })]);

