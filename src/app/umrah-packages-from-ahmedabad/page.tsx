import CityLandingPage, {
  cityMetadata,
} from "@/app/components/city/CityLandingPage";

export function generateMetadata() {
  return cityMetadata("ahmedabad");
}

export default function UmrahPackagesFromAhmedabadPage() {
  return <CityLandingPage city="ahmedabad" />;
}
