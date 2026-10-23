import GraffitiWall from "@/components/GraffitiWall";
export const metadata={title:"Graffiti Wall | ChatSpark",description:"Paint neon street art with full spray tools, win weekly votes, and download a signed artwork card."};
export default async function Page({params}){const {locale}=await params;return <GraffitiWall locale={locale}/>;}
