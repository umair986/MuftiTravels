import CityLandingPage, {
  cityMetadata,
} from "@/app/components/city/CityLandingPage";

export function generateMetadata() {
  return cityMetadata("hyderabad");
}

export default function UmrahPackagesFromHyderabadPage() {
  return <CityLandingPage city="hyderabad" />;
}
