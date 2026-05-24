"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/utils/is-user-admin";

export async function deleteMovie(movieId: string) {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return {
      type: "error",
      message: "You must be admin to delete a movie",
      errors: null,
    };
  }
  try {
    const movie = await prisma.movies.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      return { success: false, message: "Movie doesn't exist" };
    }

    await prisma.movies_countries.deleteMany({ where: { movie_id: movieId } });
    await prisma.movies_directors.deleteMany({ where: { movie_id: movieId } });
    await prisma.movies_genres.deleteMany({ where: { movie_id: movieId } });
    await prisma.movies_keywords.deleteMany({ where: { movie_id: movieId } });

    await prisma.movies.delete({ where: { id: movieId } });

    revalidatePath("/");

    return { success: true, message: "Success to delete the movie" };
  } catch (err) {
    console.error("Error when try to delete movie:", err);
    return {
      success: false,
      message: "Internal error when try to delete movie.",
    };
  }
}
