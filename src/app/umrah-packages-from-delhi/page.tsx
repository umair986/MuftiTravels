import CityLandingPage, {
  cityMetadata,
} from "@/components/city/CityLandingPage";

export function generateMetadata() {
  return cityMetadata("delhi");
}

export default function UmrahPackagesFromDelhiPage() {
  return <CityLandingPage city="delhi" />;
}
