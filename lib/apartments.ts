export type Apartment = {
  id: number;
  slug: string;
  name: string;
  building: string;
  address: string;
  area: string;
  view: string;
  guests: number;
  beds: string;
  sqm: number;
  price: number;
  monthlyPrice: number;
  usdNightly: number;
  usdMonthly: number;
  image: string;
  imageDescription: string;
  description: string;
  amenities: string[];
  wifi: string;
  images: { id: number; url: string; alt: string }[];
  active: boolean;
  availableUnits: number | null;
};

export const apartments: Apartment[] = [
  {
    id: 1,
    slug: "oceanfront-1br-anluu",
    name: "Oceanfront 1-Bedroom Executive Suite",
    building: "AnLiu Apartment",
    address: "Mai Thuc Lan St, Da Nang",
    area: "My Khe Beach",
    view: "Direct unobstructed ocean view",
    guests: 3,
    beds: "1 King bed + sofa bed",
    sqm: 50,
    price: 850000,
    monthlyPrice: 15500000,
    usdNightly: 38,
    usdMonthly: 650,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=85",
    imageDescription: "Illustrative high-end apartment interior; actual suite photos are coming soon",
    description: "A spacious one-bedroom suite at AnLiu Apartment, 150 metres from My Khe Beach, with a private sea-facing balcony and separate living room.",
    amenities: ["Private sea-facing balcony", "Separate living room", "Full kitchen", "In-unit washer", "150 Mbps fibre Wi-Fi", "Elevator access"],
    wifi: "150 Mbps",
    images: [],
    active: true,
    availableUnits: 5,
  },
  {
    id: 2,
    slug: "quiet-studio-anluu",
    name: "Quiet Living Courtyard Studio",
    building: "AnLiu Apartment",
    address: "Mai Thuc Lan St, Da Nang",
    area: "My Khe Beach",
    view: "Peaceful residential and green courtyard view",
    guests: 2,
    beds: "1 Queen bed",
    sqm: 35,
    price: 550000,
    monthlyPrice: 10000000,
    usdNightly: 24,
    usdMonthly: 420,
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=85",
    imageDescription: "Illustrative bright coastal studio interior; actual studio photos are coming soon",
    description: "A peaceful courtyard-facing studio at AnLiu Apartment, designed for focused work and easy everyday living.",
    amenities: ["Ergonomic work desk", "Ultra-quiet setting", "Dedicated 150 Mbps Wi-Fi", "Private balcony", "Kitchenette", "Washing machine"],
    wifi: "150 Mbps",
    images: [],
    active: true,
    availableUnits: 10,
  },
  {
    id: 3,
    slug: "urban-studio-doraemon",
    name: "Urban Cozy Studio - An Thuong Quarter",
    building: "Doraemonland",
    address: "Do Ba St, An Thuong, Da Nang",
    area: "An Thuong Quarter",
    view: "Vibrant street and city view",
    guests: 2,
    beds: "1 Queen bed",
    sqm: 32,
    price: 500000,
    monthlyPrice: 9000000,
    usdNightly: 22,
    usdMonthly: 380,
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=85",
    imageDescription: "Illustrative warm modern serviced studio interior; actual studio photos are coming soon",
    description: "A comfortable city-view studio at Doraemonland on Do Ba Street, in the An Thuong expat area and about 300 metres' walk from My Khe Beach.",
    amenities: ["Rooftop dipping pool access", "Elevator", "Full kitchenette", "In-unit washer", "Walk to cafés", "Walk to the night market"],
    wifi: "150 Mbps",
    images: [],
    active: true,
    availableUnits: 20,
  },
];

export const money = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;

