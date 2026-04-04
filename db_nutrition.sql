-- Creación de la tabla para el registro nutricional
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    foto_url text,
    nombre_comida text NOT NULL,
    calorias integer NOT NULL DEFAULT 0,
    proteinas numeric(5,1) NOT NULL DEFAULT 0,
    carbohidratos numeric(5,1) NOT NULL DEFAULT 0,
    grasas numeric(5,1) NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Seguridad (RLS - Row Level Security)
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver su propio registro nutricional"
    ON public.nutrition_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar su propio registro nutricional"
    ON public.nutrition_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar su propio registro nutricional"
    ON public.nutrition_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar su propio registro nutricional"
    ON public.nutrition_logs FOR DELETE
    USING (auth.uid() = user_id);
