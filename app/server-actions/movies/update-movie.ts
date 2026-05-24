"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { isAdmin } from "@/utils/is-user-admin";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const movieUpdateSchema = z.object({
  id: z.string().min(1, { message: "ID missing." }),
  title: z.string().min(1, { message: "Title is required." }),
  original_title: z.string().nullable().optional(),
  description: z.string().min(1, { message: "Description is required." }),
  release_date: z.string().min(1, { message: "Date is required." }),
  language: z.string().min(1, { message: "Language is required." }),
  type: z.string().min(1, { message: "Format is required." }),
  runtime: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || !isNaN(val), {
      message: "Runtime must be a number.",
    }),
  image_url: z.string().min(1, { message: "Image url is required." }),

  director_ids: z
    .string()
    .transform((val) => JSON.parse(val))
    .refine((val) => Array.isArray(val) && val.length > 0, {
      message: "Select at least one director minimum.",
    }),

  country_id: z.string().min(1, { message: "Country is required." }),

  genre_ids: z
    .string()
    .transform((val) => JSON.parse(val))
    .refine((val) => Array.isArray(val) && val.length > 0, {
      message: "Select at least one genre minimum.",
    }),

  keyword_ids: z
    .string()
    .transform((val) => JSON.parse(val))
    .refine((val) => Array.isArray(val), {
      message: "Select at least one genre minimum.",
    }),
});

export async function updateMovie(formData: FormData) {
  const supabase = createClient();
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return { type: "error", message: "You must be admin to update a movie" };
  }

  const prisma = new PrismaClient();

  try {
    const image = formData.get("image") as File | null;

    const parsed = movieUpdateSchema.parse({
      id: formData.get("id"),
      title: formData.get("title"),
      original_title: formData.get("original_title"),
      description: formData.get("description"),
      release_date: formData.get("release_date"),
      language: formData.get("language"),
      type: formData.get("type"),
      runtime: formData.get("runtime"),
      image_url: formData.get("image_url"),
      director_ids: formData.get("director_ids"),
      country_id: formData.get("country_id"),
      genre_ids: formData.get("genre_ids"),
      keyword_ids: formData.get("keyword_ids"),
    });

    let imageUrl = parsed.image_url || "";

    // Upload the image if provided
    if (image) {
      const filename = `${Date.now()}-${image.name.replace(/\s+/g, "-")}`;
      const { data, error } = await supabase.storage
        .from("storage")
        .upload(filename, image, { cacheControl: "3600", upsert: true });

      if (error) {
        throw new Error(error.message);
      }
      imageUrl = `${data?.path}`;
    }

    // Update movie
    await prisma.movies.update({
      where: { id: parsed.id },
      data: {
        title: parsed.title,
        original_title: parsed.original_title ?? "",
        description: parsed.description ?? "",
        release_date: parsed.release_date ?? "",
        language: parsed.language ?? "",
        type: parsed.type ?? "",
        runtime: parsed.runtime,
        image_url: imageUrl,
        updated_at: new Date(),
      },
    });

    // Update relationships (directors, countries, genres, keywords)
    await prisma.movies_directors.deleteMany({
      where: { movie_id: parsed.id },
    });
    for (const directorId of parsed.director_ids) {
      await prisma.movies_directors.create({
        data: { movie_id: parsed.id, director_id: BigInt(directorId) },
      });
    }

    await prisma.movies_countries.deleteMany({
      where: { movie_id: parsed.id },
    });
    await prisma.movies_countries.create({
      data: { movie_id: parsed.id, country_id: parseInt(parsed.country_id) },
    });

    await prisma.movies_genres.deleteMany({ where: { movie_id: parsed.id } });
    for (const genreId of parsed.genre_ids) {
      await prisma.movies_genres.create({
        data: { movie_id: parsed.id, genre_id: BigInt(genreId) },
      });
    }

    await prisma.movies_keywords.deleteMany({ where: { movie_id: parsed.id } });
    for (const keywordId of parsed.keyword_ids) {
      await prisma.movies_keywords.create({
        data: { movie_id: parsed.id, keyword_id: Number(keywordId) },
      });
    }
    revalidatePath(`/movies/${parsed.id}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating movie:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    };
  } finally {
    await prisma.$disconnect();
  }
}
