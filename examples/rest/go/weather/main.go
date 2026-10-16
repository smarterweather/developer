package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

const apiKey = "YOUR_SMARTERWEATHER_API_KEY" // insert your key here

func main() {
	req, err := http.NewRequest("GET", env("SMARTERWEATHER_API_BASE", "https://api.smarterweather.com")+"/v1/weather?lat=39.74&lon=-104.99", nil)
	if err != nil {
		log.Fatal(err)
	}
	req.Header.Set("Authorization", "Bearer "+env("SMARTERWEATHER_API_KEY", apiKey))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer res.Body.Close()

	var weather struct {
		Current struct {
			Temperature float64 `json:"temperature"`
			Conditions  string  `json:"conditions"`
		} `json:"current"`
		Attribution struct {
			Sources []string `json:"sources"`
		} `json:"attribution"`
		Detail string `json:"detail"`
	}
	if err := json.NewDecoder(res.Body).Decode(&weather); err != nil {
		log.Fatal(err)
	}
	if res.StatusCode != http.StatusOK {
		log.Fatalf("%d: %s", res.StatusCode, weather.Detail)
	}

	fmt.Printf("%g°F, %s\n", weather.Current.Temperature, weather.Current.Conditions)
	fmt.Println("Sources:", strings.Join(weather.Attribution.Sources, ", "))
}

func env(name, fallback string) string {
	if value, ok := os.LookupEnv(name); ok {
		return value
	}
	return fallback
}
