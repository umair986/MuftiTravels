import CityLandingPage, {
  cityMetadata,
} from "@/app/components/city/CityLandingPage";

export function generateMetadata() {
  return cityMetadata("mumbai");
}

export default function UmrahPackagesFromMumbaiPage() {
  return <CityLandingPage city="mumbai" />;
}
