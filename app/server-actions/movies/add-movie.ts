"use server";

import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/utils/is-user-admin";

const MAX_FILE_SIZE = 5000000;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
];

export async function addMovie(formData: FormData) {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return {
      type: "error",
      message: "You must be admin to add a movie",
      errors: null,
    };
  }

  const schema = z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .regex(/^[\s\S]*$/, "Title contains invalid characters"),
    original_title: z
      .string()
      .regex(/^[\s\S]*$/, "Title contains invalid characters")
      .optional(),
    director_name: z.string().min(1, "Director is required"),
    description: z
      .string()
      .min(5, "Synopsis must be at least 5 characters long"),
    release_date: z.string().min(4, "Release year is required"),
    runtime: z.number().min(4, "Runtime is required"),
    country_id: z.string().min(1, "Country is required"),
    genre_id: z.string().min(1, "Genre is required"),
    type: z.string().min(1, "Format is required"),
    keyword_id: z.string().min(1, "At least one keyword is required"),
    image_url: z
      .any()
      .refine(
        (file) => file?.size <= MAX_FILE_SIZE,
        `Maximum image size is 5MB`
      )
      .refine(
        (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
        `Only .jpg, .jpeg, .png, and .webp formats are allowed`
      ),
  });

  const validatedFields = schema.safeParse({
    title: formData.get("title"),
    original_title: formData.get("original_title"),
    director_name: formData.get("director_name"),
    description: formData.get("description"),
    release_date: formData.get("release_date"),
    runtime: Number(formData.get("runtime")),
    country_id: formData.get("country_id"),
    genre_id: formData.get("genre_id"),
    type: formData.get("type"),
    keyword_id: formData.get("keyword_id"),
    image_url: formData.get("image_url"),
  });

  if (!validatedFields.success) {
    console.log("Error", validatedFields.error);
    return {
      type: "error",
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please fill in all required fields",
    };
  }

  const {
    title,
    original_title,
    director_name,
    description,
    country_id,
    genre_id,
    type,
    runtime,
    keyword_id,
    release_date,
    image_url,
  } = validatedFields.data;

  console.log(validatedFields.data);

  try {
    const safeTitle = title
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]/g, "")
      .toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2, 10)}-${safeTitle}`;
    const supabase = createClient();
    const { data: imageData, error: imageError } = await supabase.storage
      .from("storage")
      .upload(fileName, image_url, {
        cacheControl: "3600",
        upsert: false,
      });

    if (imageError) {
      return {
        type: "error",
        message: "Database error: Failed to upload the image",
      };
    }

    const result = await prisma.$transaction(async (prisma) => {
      // Upsert director
      const director = await prisma.directors.upsert({
        where: { id: 0 },
        update: { name: director_name },
        create: { name: director_name },
      });

      // Create movie
      const movie = await prisma.movies.create({
        data: {
          title,
          original_title,
          release_date,
          runtime,
          type,
          description,
          image_url: imageData?.path,
        },
      });

      // Insert movie countries
      const countryIds = country_id.split(",").map(Number);
      await prisma.movies_countries.createMany({
        data: countryIds.map((countryId) => ({
          movie_id: movie.id,
          country_id: countryId,
        })),
      });

      // Link director to movie
      await prisma.movies_directors.create({
        data: {
          movie_id: movie.id,
          director_id: director.id,
        },
      });

      // Insert genres
      const genreIds = genre_id.split(",").map(Number);
      await prisma.movies_genres.createMany({
        data: genreIds.map((genreId) => ({
          movie_id: movie.id,
          genre_id: genreId,
        })),
      });

      // Insert keywords
      const keywordIds = keyword_id
        ? keyword_id
            .split(",")
            .filter((id) => id.trim() !== "")
            .map(Number)
        : [];
      if (keywordIds.length > 0) {
        await prisma.movies_keywords.createMany({
          data: keywordIds.map((keywordId) => ({
            movie_id: movie.id,
            keyword_id: keywordId,
          })),
        });
      }

      return movie;
    });
  } catch (error) {
    console.error("Error", error);
    return {
      type: "error",
      message: "Database error: Failed to add the movie",
    };
  }

  revalidatePath("/");
  redirect("/");
}
