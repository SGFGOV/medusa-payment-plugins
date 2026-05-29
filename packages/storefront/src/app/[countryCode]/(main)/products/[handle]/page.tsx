import { getProductByHandle, listProducts } from "@lib/data/products";
import { getRegion, listRegions } from "@lib/data/regions";
import ProductTemplate from "@modules/products/templates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
    params: Promise<{ countryCode: string; handle: string }>;
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
    try {
        const countryCodes = await listRegions().then((regions) =>
            regions?.flatMap((r) => r.countries?.map((c) => c.iso_2))
        );

        if (!countryCodes) {
            return [];
        }

        const products = await listProducts({
            countryCode: "US",
            queryParams: { fields: "handle" }
        }).then(({ response }) => response.products);

        return countryCodes
            .flatMap((countryCode) =>
                products.map((product) => ({
                    countryCode,
                    handle: product.handle
                }))
            )
            .filter((param) => param.handle);
    } catch (error) {
        console.error(
            `Failed to generate static paths for product pages: ${
                error instanceof Error ? error.message : "Unknown error"
            }.`
        );
        return [];
    }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params;
    const { handle } = params;
    const region = await getRegion(params.countryCode);

    if (!region) {
        notFound();
    }

    const product = await getProductByHandle(params.countryCode, handle);

    if (!product) {
        notFound();
    }

    return {
        title: `${product.title} | Medusa Store`,
        description: `${product.title}`,
        openGraph: {
            title: `${product.title} | Medusa Store`,
            description: `${product.title}`,
            images: product.thumbnail ? [product.thumbnail] : []
        }
    };
}

export default async function ProductPage(props: Props) {
    const params = await props.params;
    const region = await getRegion(params.countryCode);

    if (!region) {
        notFound();
    }

    const pricedProduct = await getProductByHandle(
        params.countryCode,
        params.handle
    );

    if (!pricedProduct) {
        notFound();
    }

    return (
        <ProductTemplate
            product={pricedProduct}
            region={region}
            countryCode={params.countryCode}
        />
    );
}
