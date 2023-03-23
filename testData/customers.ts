import fs from "fs/promises";
import Jstream from "../src/Jstream";

import { lazy } from "../src/privateUtils/functional";

export interface Customer {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    gender:
        | "Agender"
        | "Bigender"
        | "Female"
        | "Genderfluid"
        | "Genderqueer"
        | "Male"
        | "Non-binary"
        | "Polygender";
    ip_address: string;
    city: string;
    state: string;
    security_enabled: boolean;
    profile_pic: string;
    company_name: string;
    bad_text: string;
}

export const getCustomers = lazy(async (): Promise<Jstream<Customer>> => {
    const data = await fs.readFile("./testData/customerData.json");
    const customers = JSON.parse(data.toString()) as any[];
    return Jstream.over(customers);
});
