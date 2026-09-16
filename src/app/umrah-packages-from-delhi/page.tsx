import CityLandingPage, {
  cityMetadata,
} from "@/app/components/city/CityLandingPage";

export function generateMetadata() {
  return cityMetadata("delhi");
}

export default function UmrahPackagesFromDelhiPage() {
  return <CityLandingPage city="delhi" />;
}
