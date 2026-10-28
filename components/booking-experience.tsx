"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { money, type Apartment } from "@/lib/apartments";
import { vietnamToday } from "@/lib/dates";

type InquiryResponse = { ok?: boolean; error?: string };
type Confirmation = { name: string; roomName: string; checkIn: string; checkOut: string };

export function BookingExperience({ apartments }: { apartments: Apartment[] }) {
  const [building, setBuilding] = useState("All buildings");
  const [guests, setGuests] = useState("Any guests");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState<Apartment | null>(null);
  const [modalCheckIn, setModalCheckIn] = useState("");
  const [modalCheckOut, setModalCheckOut] = useState("");
  const [pending, setPending] = useState(false);
  const [inquiryError, setInquiryError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const today = vietnamToday();
  const visible = searched ? apartments.filter((apartment) =>
    (building === "All buildings" || apartment.building === building) &&
    (guests === "Any guests" || apartment.guests >= Number(guests))
  ) : apartments;

  useEffect(() => {
    if (!selected) return;
    if (confirmation) doneRef.current?.focus();
    else nameRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) closeInquiry();
      if (event.key !== "Tab") return;
      const focusable = Array.from(document.querySelectorAll<HTMLElement>(".inquiry-modal button:not([disabled]), .inquiry-modal input:not([disabled]), .inquiry-modal select:not([disabled])")).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected, pending, confirmation]);

  function closeInquiry() {
    setSelected(null);
    setConfirmation(null);
    setInquiryError("");
  }

  function search() {
    if ((checkIn && !checkOut) || (!checkIn && checkOut) || (checkIn && (checkIn < today || checkOut <= checkIn))) {
      setSearchError("Choose a valid check-in and check-out date, or leave both dates empty.");
      return;
    }
    setSearchError("");
    setSearched(true);
    document.getElementById("apartments")?.scrollIntoView({ behavior: "smooth" });
  }

  function openInquiry(apartment: Apartment) {
    if (apartment.availableUnits === 0) return;
    setSelected(apartment);
    setModalCheckIn(checkIn);
    setModalCheckOut(checkOut);
    setInquiryError("");
    setConfirmation(null);
    setRequestId(crypto.randomUUID());
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || selected.availableUnits === 0 || pending) return;
    if (!modalCheckIn || !modalCheckOut || modalCheckIn < today || modalCheckOut <= modalCheckIn) {
      setInquiryError("Please select valid check-in and check-out dates.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = {
      apartmentId: selected.id,
      checkIn: modalCheckIn,
      checkOut: modalCheckOut,
      guests: Number(form.get("guests")),
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      website: String(form.get("website") || ""),
      requestId,
    };
    setPending(true);
    setInquiryError("");
    try {
      const response = await fetch("/api/whatsapp-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as InquiryResponse;
      if (!response.ok || !result.ok) throw new Error(result.error || "The inquiry could not be sent. Please try again.");
      setConfirmation({ name: payload.name, roomName: selected.name, checkIn: payload.checkIn, checkOut: payload.checkOut });
      setPending(false);
    } catch (error) {
      setInquiryError(error instanceof Error ? error.message : "The inquiry could not be sent. Please try again.");
      setPending(false);
    }
  }

  return <>
    <section className="search-section"><div className="search-intro"><span className="eyebrow">YOUR STAY STARTS HERE</span><h2>Find your Da Nang home.</h2></div><div><div className="search-bar"><label>BUILDING<select value={building} onChange={(event) => setBuilding(event.target.value)}><option>All buildings</option>{Array.from(new Set(apartments.map(room => room.building))).map(name => <option key={name}>{name}</option>)}</select></label><label>CHECK-IN<input type="date" value={checkIn} min={today} onChange={(event) => { setCheckIn(event.target.value); if (checkOut && checkOut <= event.target.value) setCheckOut(""); }}/></label><label>CHECK-OUT<input type="date" value={checkOut} min={checkIn || today} onChange={(event) => setCheckOut(event.target.value)}/></label><label>GUESTS<select value={guests} onChange={(event) => setGuests(event.target.value)}><option>Any guests</option>{Array.from({ length: Math.max(3, ...apartments.map(room => room.guests)) }, (_, index) => index + 1).map(count => <option key={count} value={count}>{count} {count === 1 ? "guest" : "guests"}</option>)}</select></label><button type="button" onClick={search}>Explore <span>↗</span></button></div>{searchError && <p className="search-empty" role="alert">{searchError}</p>}</div></section>
    <section id="apartments" className="collection"><div className="section-top"><div><span className="eyebrow">THE COLLECTION</span><h2>Find a place to<br/><em>feel at home.</em></h2></div><p>Find your room by My Khe Beach or in An Thuong Quarter.</p></div><div className="listing-count">EXPLORE THE ROOM COLLECTION <span>↘</span></div><div className="grid">{visible.map((apartment) => <article className="card" key={apartment.id}><Link href={`/apartments/${apartment.slug}`} className="card-image"><img src={apartment.image} alt={apartment.imageDescription} width={660} height={500} loading="lazy" decoding="async"/><span className="card-badge">{apartment.building}</span>{apartment.images.length === 0 && <span className="image-note">Illustrative photo</span>}</Link><div className="card-info"><div><Link href={`/apartments/${apartment.slug}`}><h3>{apartment.name}</h3></Link><p>Up to {apartment.guests} guests · {apartment.sqm} m²</p><p>{apartment.view}</p></div><div className="card-price"><strong>{money(apartment.price)}</strong><small>/ night</small><strong className="monthly-price">{money(apartment.monthlyPrice)}</strong><small>/ month</small>{apartment.availableUnits !== null && <span className={apartment.availableUnits === 0 ? "availability-badge unavailable" : "availability-badge"}>{apartment.availableUnits === 0 ? "Fully booked for selected period" : `Only ${apartment.availableUnits} ${apartment.availableUnits === 1 ? "room" : "rooms"} left`}</span>}</div></div><button type="button" className="whatsapp-cta" disabled={apartment.availableUnits === 0} onClick={() => openInquiry(apartment)}>{apartment.availableUnits === 0 ? "Fully booked" : "Inquire via WhatsApp"} <span>↗</span></button></article>)}</div>{visible.length === 0 && <p className="search-empty" role="status">No room type matches those filters. Try another building or guest count.</p>}<p className="rates-note">Dates are carried into your inquiry; availability is confirmed by our team. USD guide rates are shown on each room page.</p></section>
    {selected && <div className="inquiry-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) closeInquiry(); }}><section className="inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-title"><button type="button" className="modal-close" aria-label="Close inquiry" onClick={closeInquiry} disabled={pending}>×</button>{confirmation ? <div className="inquiry-success" role="status"><span className="success-badge" aria-hidden="true">✓</span><span className="eyebrow">REQUEST CONFIRMED</span><h2 id="inquiry-title">Inquiry Received</h2><p>Thank you, {confirmation.name}! We have received your booking request for {confirmation.roomName} ({confirmation.checkIn} to {confirmation.checkOut}). Our host will review availability and contact you via WhatsApp shortly.</p><a className="support-link" href="https://wa.me/84766518838" target="_blank" rel="noopener noreferrer">Need immediate support? Chat with host ↗</a><button ref={doneRef} type="button" className="modal-submit" onClick={closeInquiry}>Done</button></div> : <><span className="eyebrow">DIRECT INQUIRY</span><h2 id="inquiry-title">Plan your stay.</h2><p className="modal-room">{selected.name} · {selected.building}</p><form onSubmit={submitInquiry}><div className="date-pair"><label>CHECK-IN<input required type="date" name="checkIn" value={modalCheckIn} min={today} onChange={(event) => { setModalCheckIn(event.target.value); if (modalCheckOut && modalCheckOut <= event.target.value) setModalCheckOut(""); }}/></label><label>CHECK-OUT<input required type="date" name="checkOut" value={modalCheckOut} min={modalCheckIn || today} onChange={(event) => setModalCheckOut(event.target.value)}/></label></div><label>GUESTS<select name="guests" defaultValue={guests !== "Any guests" && Number(guests) <= selected.guests ? guests : "2"}>{Array.from({ length: selected.guests }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? "guest" : "guests"}</option>)}</select></label><label>YOUR NAME<input ref={nameRef} required name="name" maxLength={100} autoComplete="name"/></label><label>WHATSAPP PHONE NUMBER<input required type="tel" name="phone" maxLength={24} autoComplete="tel" placeholder="+84 123 456 789"/></label><div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>{inquiryError && <p className="inquiry-error" role="alert">{inquiryError}</p>}<button type="submit" className="modal-submit" disabled={pending}>{pending ? "Sending inquiry…" : "Send booking inquiry ↗"}</button></form><p className="modal-note">Our host will review availability and contact you via WhatsApp. No payment is taken.</p></>}</section></div>}
  </>;
}

