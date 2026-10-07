import CityLandingPage, {
  cityMetadata,
} from "@/app/components/city/CityLandingPage";

export function generateMetadata() {
  return cityMetadata("bangalore");
}

export default function UmrahPackagesFromBangalorePage() {
  return <CityLandingPage city="bangalore" />;
}
