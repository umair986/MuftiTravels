import CityLandingPage, {
  cityMetadata,
} from "@/components/city/CityLandingPage";

export function generateMetadata() {
  return cityMetadata("lucknow");
}

export default function UmrahPackagesFromLucknowPage() {
  return <CityLandingPage city="lucknow" />;
}
