import "../../experience-header.css";
import PoemWall from "@/components/PoemWall";
export const metadata={title:"Poem Wall | ChatSpark",description:"Anonymous poems by strangers. Like your favorites; only the weekly top five survive."};
export default async function Page({params}){const {locale}=await params;return <PoemWall locale={locale}/>;}
