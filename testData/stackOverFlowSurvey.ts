import csv from "csv-parse/sync";
import fs from "fs/promises";
import Tstream from "../src/Tstream";

import { lazy } from "../src/privateUtils/functional";

export interface StackOverflowSurveyRespondent {}

export const getStackOverflowSurvey = lazy(
    async (): Promise<Tstream<StackOverflowSurveyRespondent>> => {
        let data: any = undefined;

        try {
            data = await fs.readFile(
                "./testData/stack overflow survey/survey_results_public.csv"
            );
        } catch (e) {
            console.log(
                "   ***************************************************************************************"
            );
            console.log(
                "   ****testData/stack overflow survey/surveyResults_public.zip may need to be unzipped****"
            );
            console.log(
                "   ***************************************************************************************"
            );
            throw e;
        }
        const parsedData: string[][] = csv.parse(data);
        return Tstream.from(parsedData)
            .skip(1)
            .map(e => {
                const record: Record<string, string> = {};
                e.forEach(
                    (value: string, i: number) =>
                        (record[parsedData[0][i]] = value)
                );
                return record;
            }) as any;
    }
);
