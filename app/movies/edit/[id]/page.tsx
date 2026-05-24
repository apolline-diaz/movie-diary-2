import { getMovie } from "@/app/server-actions/movies/get-movie";
import EditMovieForm from "./edit-movie-form";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/utils/auth";
import BackButton from "@/app/components/back-button";

export const metadata: Metadata = {
  title: "Modifier un film | Queer Cinema Database",
  description: "Modifiez les informations d’un film déjà existant.",
};

export default async function EditMoviePage({
  params,
}: {
  params: { id: string };
}) {
  const { movie, error } = await getMovie(params.id);
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (error || !movie) {
    return notFound();
  }

  return (
    <div className="px-10 py-20 flex justify-start">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-pink-500 mb-5">
          <BackButton />
          Modifier le film
        </h1>
        <EditMovieForm movie={movie} />
      </div>
    </div>
  );
}
