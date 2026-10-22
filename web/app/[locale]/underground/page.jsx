import UndergroundFM from "@/components/UndergroundFM";
export const metadata={title:"Underground FM | ChatSpark",description:"Discover unfamiliar music with random strangers. Temporary rooms. No uploads."};
export default async function UndergroundPage({params}){const {locale}=await params;return <UndergroundFM locale={locale}/>;}
