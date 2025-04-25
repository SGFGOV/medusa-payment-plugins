"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSearchParams } from "next/navigation";
import { sdk } from "@lib/config";
import axios from "axios";

const ProcessingPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const cart= searchParams.get("cart");
    

    useEffect(() => {
        let isCancelled = false;

        const fetchData = async () => {
            try {
                const url = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/checkout/is-paid?cart=${cart}`
                console.log("Fetching data from URL:", url);
                let response = await axios.get(url,{
                    headers: {
                        'content-type': 'application/json',
                        'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
                    }
                }) as any;
                    
                const result = await sdk.store.cart.complete(cart!) as  {
                    order: {
                        id: string;
                    };
                }
                const redirectUrl = `/order/${result.order.id}/confirmed`
                
                //const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/checkout/is-paid?cart=${cart}`);
               /// const data = response.data;
                if (!isCancelled && redirectUrl) {
                    router.push(redirectUrl);
                }
            } catch (error) {
                if (!isCancelled) {
                    console.log("Error fetching data:", JSON.stringify(error));
                }
            } finally {
                if (!isCancelled) {
                    setTimeout(fetchData, 5000); // Poll every 5 seconds
                }
            }
        };

        fetchData();

        return () => {
            isCancelled = true;
        };
    }, []);

    return (
        <div>
            <h1>Processing...</h1>
            <p>Please wait while we process your request.</p>
        </div>
    );
};

export default ProcessingPage;