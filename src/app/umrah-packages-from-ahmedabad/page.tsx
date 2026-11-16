import CityLandingPage, {
  cityMetadata,
} from "@/components/city/CityLandingPage";

export function generateMetadata() {
  return cityMetadata("ahmedabad");
}

export default function UmrahPackagesFromAhmedabadPage() {
  return <CityLandingPage city="ahmedabad" />;
}
