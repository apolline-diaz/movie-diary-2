"use client";

import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { updateMovie } from "@/app/server-actions/movies/update-movie";
import { Image } from "@/app/components/image";
import { getImageUrl } from "@/utils/index";
import { Movie } from "@/app/types/movie";
import { getKeywords } from "@/app/server-actions/keywords/get-keywords";
import { getCountries } from "@/app/server-actions/countries/get-countries";
import { getGenres } from "@/app/server-actions/genres/get-genres";
import { getDirectors } from "@/app/server-actions/directors/get-directors";
import MultiSelect from "@/app/components/multi-select";
import { SubmitButton } from "@/app/components/submit-button";
import { uploadImage } from "@/utils/upload-image";

type KeywordOption = {
  value: string;
  label: string;
};

type CountryOption = {
  value: string;
  label: string;
};

type GenreOption = {
  value: string;
  label: string;
};

type DirectorOption = {
  value: string;
  label: string;
};

type FormData = {
  title: string;
  original_title: string | null;
  description: string | null;
  release_date: string | null;
  language: string | null;
  runtime: number | null;
  image_url: string;
  image: FileList | null;
  type: string | null;
  directors: string[];
  country_id: string;
  country: string;
  genre_ids: string[];
  genres: string[];
  keyword_ids: string[];
  keywords: string[];
};

export default function EditMovieForm({ movie }: { movie: Movie }) {
  // Initialize form and states
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configure options for select dropdowns
  const [availableKeywords, setAvailableKeywords] = useState<KeywordOption[]>(
    []
  );
  const [availableCountries, setAvailableCountries] = useState<CountryOption[]>(
    []
  );
  const [availableGenres, setAvailableGenres] = useState<GenreOption[]>([]);
  const [availableDirectors, setAvailableDirectors] = useState<
    DirectorOption[]
  >([]);

  // Filtered and selected states
  const [selectedDirectors, setSelectedDirectors] = useState<DirectorOption[]>(
    []
  );
  const [selectedKeywords, setSelectedKeywords] = useState<KeywordOption[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<GenreOption[]>([]);

  // Image preview
  const [imagePreview, setImagePreview] = useState<string | null>(
    movie.image_url || null
  );

  // Init React Hook Form : prepare initial form values from movie data
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: movie.title,
      original_title: movie.original_title || "",
      description: movie.description || "",
      release_date: movie.release_date || "",
      language: movie.language || "",
      type: movie.type || "",
      runtime: movie.runtime || null,
      image_url: movie.image_url || "",
      image: null,
      directors: [],
      country_id:
        movie.countries && movie.countries[0]
          ? movie.countries[0].id.toString()
          : "",
      genres: [],
      keywords: [],
    },
  });

  // Watch for image changes to update preview
  const imageFile = watch("image");
  const imageUrl = watch("image_url");

  // Fetch all reference data on component mount
  useEffect(() => {
    const fetchReferenceData = async () => {
      // Fetch keywords
      const keywords = await getKeywords();
      setAvailableKeywords(
        keywords.map((k) => ({
          value: k.value.toString(),
          label: k.label || "",
        }))
      );

      // Fetch countries
      const countries = await getCountries();
      setAvailableCountries(
        countries.map((c) => ({
          value: c.id.toString(),
          label: c.name,
        }))
      );

      // Fetch genres
      const genres = await getGenres();
      setAvailableGenres(
        genres.map((g) => ({
          value: g.id.toString(),
          label: g.name || "",
        }))
      );

      // Fetch directors
      const directors = await getDirectors();
      setAvailableDirectors(
        directors.map((d) => ({
          value: d.id.toString(),
          label: d.name || "",
        }))
      );

      // Set initially selected directors
      if (movie.directors && movie.directors.length > 0) {
        const movieDirectors = movie.directors
          .filter((director) => director.name)
          .map((director) => ({
            value: director.id.toString(),
            label: director.name || "",
          }));
        setSelectedDirectors(movieDirectors);
        setValue(
          "directors",
          movieDirectors.map((d) => d.value)
        );
      }

      // Set initially selected genres
      if (movie.genres && movie.genres.length > 0) {
        const movieGenres = movie.genres
          .filter((genre) => genre.name)
          .map((genre) => ({
            value: genre.id.toString(),
            label: genre.name || "",
          }));
        setSelectedGenres(movieGenres);
        setValue(
          "genres",
          movieGenres.map((g) => g.value)
        );
      }

      // Set initially selected keywords
      if (movie.keywords && movie.keywords.length > 0) {
        const movieKeywords = movie.keywords
          .filter((keyword) => keyword.name)
          .map((keyword) => ({
            value: keyword.id.toString(),
            label: keyword.name || "",
          }));
        setSelectedKeywords(movieKeywords);
        setValue(
          "keywords",
          movieKeywords.map((k) => k.value)
        );
      }

      // Set selected country
      if (movie.countries && movie.countries.length > 0) {
        setValue("country_id", movie.countries[0].id.toString());
      }
    };

    fetchReferenceData();
  }, [movie, setValue]);

  useEffect(() => {
    if (imageFile && imageFile.length > 0) {
      const file = imageFile[0];
      const fileUrl = URL.createObjectURL(file);
      setImagePreview(fileUrl);

      // Clean up the object URL when the component unmounts or the file changes
      return () => URL.revokeObjectURL(fileUrl);
    } else if (imageUrl) {
      // Use the image URL if no file is uploaded
      setImagePreview(imageUrl);
    }
  }, [imageFile, imageUrl]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      let imageUrl = data.image_url;

      if (imageFile && imageFile instanceof File) {
        imageUrl = await uploadImage(imageFile, data.title);
      }

      const formDataToUpdate = new FormData();
      formDataToUpdate.append("id", movie.id);
      formDataToUpdate.append("title", data.title);
      formDataToUpdate.append("original_title", data.original_title ?? "");
      formDataToUpdate.append("description", data.description ?? "");
      formDataToUpdate.append("release_date", data.release_date ?? "");
      formDataToUpdate.append("language", data.language ?? "");
      formDataToUpdate.append("type", data.type ?? "");
      formDataToUpdate.append("runtime", data.runtime?.toString() ?? "");
      formDataToUpdate.append("image_url", imageUrl);

      if (data.image && data.image.length > 0) {
        formDataToUpdate.append("image", data.image[0]);
      }

      formDataToUpdate.append("director_ids", JSON.stringify(data.directors));
      formDataToUpdate.append("country_id", data.country_id);
      formDataToUpdate.append("genre_ids", JSON.stringify(data.genres));
      formDataToUpdate.append("keyword_ids", JSON.stringify(data.keywords));

      const { success, error } = await updateMovie(formDataToUpdate);

      if (success) {
        router.push(`/movies/${movie.id}`);
        router.refresh();
      } else {
        setError(error || "Something went wrong");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1895 + 1 },
    (_, i) => currentYear - i
  );

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-lg text-black justify-start mx-auto"
      >
        {error && (
          <div className="mb-4 p-4 bg-red-500 text-white rounded-md">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Title */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Titre</label>
            <input
              {...register("title", {
                required: "Le titre est obligatoire. Au moins 1 caractère.",
              })}
              className="w-full py-2 text-sm font-light border rounded-md px-2 bg-white text-black border-black bg-transparent"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Original Title */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Titre original
            </label>
            <input
              {...register("original_title")}
              className="w-full py-2 text-sm font-light border rounded-md px-2 bg-white text-black border-black bg-transparent"
            />
            {errors.original_title && (
              <p className="text-red-500 text-sm mt-1">
                {errors.original_title.message}
              </p>
            )}
          </div>

          {/* Director Select */}
          <div>
            <label htmlFor="director_id" className="block text-sm font-medium">
              Réalisateur-ice(s)
            </label>
            <Controller
              name="directors"
              control={control}
              rules={{
                required:
                  "Veuillez sélectionner au moins un·e réalisateur·ice.",
              }}
              render={() => (
                <MultiSelect
                  name="directors"
                  control={control}
                  options={availableDirectors}
                  label="Réalisateur-ices"
                  placeholder="Chercher et ajouter des réalisateur-ices..."
                  onChange={(selected) => {
                    setSelectedDirectors(selected);
                    setValue(
                      "directors",
                      selected.map((d) => d.value)
                    );
                  }}
                  defaultValues={selectedDirectors}
                />
              )}
            />

            <p className="text-gray-600 text-xs mt-1">
              Vous pouvez sélectionner plusieurs réalisateur-ices et en retirer.
            </p>

            {errors?.directors && (
              <span id="directors-error" className="text-pink-500 text-xs my-2">
                {errors.directors.message}
              </span>
            )}
          </div>

          {/* Image Preview */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-3">
              Image actuelle
            </label>
            <div className="relative rounded-xl h-64 bg-gray-700 overflow-hidden">
              {imagePreview ? (
                <Image
                  src={getImageUrl(imagePreview)}
                  alt={movie.title}
                  style={{ objectFit: "cover" }}
                  className="rounded-md  w-full h-full"
                  title={movie.title}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Pas d&apos;image disponible
                </div>
              )}
            </div>
          </div>

          {/* Image URL */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Image URL</label>
            <input
              {...register("image_url")}
              className="w-full py-2 text-sm font-light border-b bg-transparent"
              disabled
            />
            <p className="text-gray-600 text-xs mt-1">
              Sera utilisée si aucune image n&apos;est téléchargée
            </p>
          </div>

          {/* Image Upload */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Télécharger une nouvelle image
            </label>
            <input
              type="file"
              accept="image/*"
              {...register("image")}
              className="w-full py-2 hover:cursor-pointer focus:outline-none"
            />
            <p className="text-gray-600 text-xs mt-1">
              Laisser vide pour garder l&apos;image actuelle ou utiliser
              l&apos;URL ci-dessus
            </p>
          </div>

          {/* Description */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Synopsis</label>
            <textarea
              {...register("description", {
                required: "Le synopsis est obligatoire. Au moins 3 caractères",
                min: {
                  value: 3,
                  message: "Le synopsis contient au moins 3 caractères.",
                },
              })}
              rows={4}
              className="w-full px-3 py-2 text-black font-light text-sm border bg-white border-black rounded-md bg-transparent"
            />
            {errors.description && (
              <span className="text-pink-500 text-xs my-2">
                {errors.description.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Release Date */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Année de sortie
              </label>
              <select
                {...register("release_date", {
                  required: "L'année de sortie est obligatoire.",
                })}
                className="w-full text-sm font-light py-2 border rounded-md px-2 bg-white text-black border-black"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Select */}
            <div>
              <label htmlFor="country_id" className="block text-sm font-medium">
                Pays
              </label>
              <select
                id="country_id"
                {...register("country_id", {
                  required: "Le pays est obligatoire.",
                })}
                className="w-full mt-1 block text-sm font-light bg-transparent border rounded-md px-2 bg-white text-black border-black  py-2"
              >
                <option value="">Select a country</option>
                {availableCountries.map((country) => (
                  <option
                    key={country.value}
                    value={country.value}
                    // Mark as selected if it matches the current country
                    selected={
                      movie.countries &&
                      movie.countries[0]?.id.toString() === country.value
                    }
                  >
                    {country.label}
                  </option>
                ))}
              </select>
              {errors.country_id && (
                <span className="text-pink-500 text-xs my-2">
                  {errors.country_id.message}
                </span>
              )}
            </div>

            {/* Runtime */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Durée (minutes/saisons)
              </label>
              <input
                type="number"
                {...register("runtime", {
                  pattern: {
                    value: /^\d*\.?\d*$/,
                    message: "Dois être un nombre",
                  },
                  required: "La durée est obligatoire.",
                  min: {
                    value: 1,
                    message: "La durée doit être supérieure à 0.",
                  },
                })}
                className="w-full text-sm font-light border-black  py-2 border rounded-md px-2 bg-white text-black bg-transparent"
              />
              {errors.runtime && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.runtime.message}
                </p>
              )}
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Langue(s)
              </label>
              <input
                {...register("language", {
                  required: "La langue est obligatoire.",
                })}
                className="w-full text-sm border-black font-light py-2 border rounded-md px-2 bg-white text-black bg-transparent"
              />
              {errors.language && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.language.message}
                </p>
              )}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select
              {...register("type", { required: "Le format est obligatoire." })}
              className="w-full text-sm font-light border-black py-2 border rounded-md px-2 bg-white text-black"
            >
              <option value="Long-métrage">Long-métrage</option>
              <option value="Moyen-métrage">Moyen-métrage</option>
              <option value="Court-métrage">Court-métrage</option>
              <option value="Série">Série</option>
              <option value="Emission TV">Emission TV</option>
            </select>
            {errors.type && (
              <span className="text-pink-500 text-xs my-2">
                {errors.type.message}
              </span>
            )}
          </div>

          {/* Genres */}
          <div>
            <label className="text-black block text-sm font-medium mb-1">
              Genres
            </label>

            <Controller
              name="genres"
              control={control}
              rules={{
                required: "Au moins un genre est requis.",
                validate: (value) =>
                  Array.isArray(value) && value.length > 0
                    ? true
                    : "Au moins un genre est requis.",
              }}
              render={({ field }) => (
                <MultiSelect
                  name="genres"
                  control={control}
                  options={availableGenres}
                  label="Genres"
                  placeholder="Chercher et ajouter des genres..."
                  onChange={(selected) => {
                    setSelectedGenres(selected);
                    field.onChange(selected.map((g) => g.value));
                  }}
                  defaultValues={selectedGenres}
                />
              )}
            />

            <p className="text-gray-600 text-xs mt-1">
              Vous pouvez sélectionner plusieurs genres et en retirer.
            </p>

            {errors?.genres && (
              <span className="text-pink-500 text-xs my-2">
                {errors.genres.message}
              </span>
            )}
          </div>

          {/* Keywords */}
          <div>
            <label className="text-black block text-sm font-medium mb-1">
              Mots-clés
            </label>

            <Controller
              name="keywords"
              control={control}
              rules={{
                required: "Au moins un mot-clé est requis.",
                validate: (value) =>
                  Array.isArray(value) && value.length > 0
                    ? true
                    : "Au moins un mot-clé est requis.",
              }}
              render={({ field }) => (
                <MultiSelect
                  name="keywords"
                  control={control}
                  options={availableKeywords}
                  label="Mots-clé"
                  placeholder="Chercher et ajouter des mot-clés..."
                  onChange={(selected) => {
                    setSelectedKeywords(selected);
                    const values = selected.map((k) => k.value);
                    field.onChange(values);
                  }}
                  defaultValues={selectedKeywords}
                />
              )}
            />

            <p className="text-gray-600 text-xs mt-1">
              Vous pouvez sélectionner plusieurs mot-clés et en retirer.
            </p>

            {errors?.keywords && (
              <span className="text-pink-500 text-xs my-2">
                {errors.keywords.message}
              </span>
            )}
          </div>
        </div>

        <div className="mt-8 font-light flex flex-col gap-3 xs:flex-col sm:flex-row justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="xs:w-full sm:w-[200px] border hover:border-red-500 hover:text-red-500 text-black px-4 py-2 border-black rounded-xl"
          >
            Annuler
          </button>
          <SubmitButton
            defaultText="Enregistrer les modifications"
            loadingText="Chargement..."
            isSubmitting={isSubmitting}
          />
        </div>
      </form>
    </>
  );
}
