import CityLandingPage, {
  cityMetadata,
} from "@/app/components/city/CityLandingPage";

export function generateMetadata() {
  return cityMetadata("lucknow");
}

export default function UmrahPackagesFromLucknowPage() {
  return <CityLandingPage city="lucknow" />;
}
