import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { getImageUrl, getCanonicalUrl } from "@/utils/index";
import { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: { slug: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // read route params
  const id = params.slug;

  // fetch data
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: movie } = await supabase
    .from("movies")
    .select()
    .match({ id })
    .single();

  if (!movie) {
    return { title: "", description: "" };
  }

  return {
    title: movie.title,
    description: movie.description,
    openGraph: {
      images: [getImageUrl(movie.image_url)],
    },
    alternates: {
      canonical: `/movies/${id}`,
    },
  };
}

export async function generateStaticParams() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: movies } = await supabase.from("movies").select("id");

  if (!movies) {
    return [];
  }

  return movies.map((movie) => ({
    slug: movie.id.toString(),
  }));
}

export default async function Page({ params }: Props) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: movie, error } = await supabase
    .from("movies")
    .select("id, title, description, image_url, release_date")
    .eq("id", params.slug)
    .single();

  if (error) {
    return <div>Erreur lors du chargement du film : {error.message}</div>;
  }

  if (!movie) {
    return <div>Film introuvable</div>;
  }

  return (
    <>
      <div className="px-12 py-12 max-w-7xl mx-auto min-h-screen">
        <div className="flex justify-between mb-6 lg:mb-12">
          <h2 className="text-3xl lg:text-4xl items-start uppercase">
            {movie.title}
          </h2>
          <h3>{movie.release_date}</h3>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mb-4">
          <div className="flex items-center justify-center">
            <Image
              className="p-2"
              width={500}
              height={500}
              alt={movie.title}
              src={getImageUrl(movie.image_url)}
            ></Image>
          </div>
        </div>
        <div className="pt-6">
          <label className="font-bold pb-2 border-b-2 border-gray-800 border-opacity15">
            SYNOPSIS
          </label>
          <p className="text-gray-600 text-lg my-4 pt-4 pb-6">
            {movie.description}
          </p>
        </div>
      </div>
    </>
  );
}
