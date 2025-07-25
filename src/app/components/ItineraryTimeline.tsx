"use client";

import { Timeline } from "./ui/timeline";
import React from "react";

const itineraryData = [
  {
    title: "Before Departure",
    content: (
      <ul className="list-disc text-black space-y-2 pl-4">
        <li>Mumbai to Jeddah flight (Carry all necessary documents)</li>
        <li>AHRAM to be worn before arriving at the airport</li>
        <li>Arrival at Mumbai airport - 5 hours before departure</li>
        <li>Meet representative at informed point</li>
        <li>Complete immigration & board the flight</li>
        <li>Baggage as per airline policy</li>
      </ul>
    ),
  },
  {
    title: "Arrival Day",
    content: (
      <ul className="list-disc text-black space-y-2 pl-4">
        <li>Land at Jeddah Airport, complete immigration</li>
        <li>Meet group at Jeddah & board bus to Makkah hotel</li>
        <li>Check-in, meals depending on arrival time</li>
        <li>Perform Umrah after rest (3 hours)</li>
      </ul>
    ),
  },
  {
    title: "Day 2 - Day 6",
    content: (
      <ul className="list-disc text-black space-y-2 pl-4">
        <li>Prayers, Quran Recitation, Tawaf</li>
        <li>Optional Umrah from Masjid Aisha</li>
        <li>Ziyarat within Makkah after Fajr</li>
        <li>Return for Zohr at Haram</li>
      </ul>
    ),
  },
  {
    title: "Day 7 - Day 8",
    content: (
      <ul className="list-disc text-black space-y-2 pl-4">
        <li>Final Umrah (optional), Alwidai Tawaf</li>
        <li>Travel to Madina (8 hours), hotel check-in</li>
      </ul>
    ),
  },
  {
    title: "Day 9 - Day 10",
    content: (
      <ul className="list-disc text-black space-y-2 pl-4">
        <li>Fajr in Masjid Nabvi, Ziyarat of Roza Sherief (Men)</li>
        <li>Breakfast, Ziyarat to Jannat Ul Baqi (Men)</li>
      </ul>
    ),
  },
  {
    title: "Day 11 - Day 14",
    content: (
      <ul className="list-disc text-black space-y-2 pl-4">
        <li>Prayers, Ziyarat, Riyazul Jannah, Asahabe Sufah</li>
        <li>Free to explore Madina</li>
      </ul>
    ),
  },
  {
    title: "Day 15",
    content: (
      <ul className="list-disc text-black space-y-2 pl-4">
        <li>Travel back to Jeddah Airport</li>
        <li>Receive 5L Zamzam, Flight to Mumbai</li>
      </ul>
    ),
  },
];

export default function ItineraryTimeline() {
  return (
    <div className="bg-white">
      <Timeline data={itineraryData} />
    </div>
  );
}
