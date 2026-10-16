package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// Quick local try: paste your key below. Prefer the SMARTERWEATHER_API_KEY
// environment variable, which wins when set, and never commit a real key.
const apiKey = "YOUR_SMARTERWEATHER_API_KEY" // insert your key here

func main() {
	log.SetFlags(0)
	req, err := http.NewRequest("GET", env("SMARTERWEATHER_API_BASE", "https://api.smarterweather.com")+"/v1/weather?lat=39.74&lon=-104.99", nil)
	if err != nil {
		log.Fatal(err)
	}
	req.Header.Set("Authorization", "Bearer "+env("SMARTERWEATHER_API_KEY", apiKey))
	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode > 299 {
		body, _ := io.ReadAll(res.Body)
		log.Fatalf("%d: %s", res.StatusCode, problemText(body))
	}

	var weather struct {
		Current struct {
			Temperature float64 `json:"temperature"`
			Conditions  string  `json:"conditions"`
		} `json:"current"`
		Attribution struct {
			Sources []string `json:"sources"`
		} `json:"attribution"`
	}
	if err := json.NewDecoder(res.Body).Decode(&weather); err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%g°F, %s\n", weather.Current.Temperature, weather.Current.Conditions)
	fmt.Println("Sources:", strings.Join(weather.Attribution.Sources, ", "))
}

// env returns the variable's value, or fallback when it is unset or empty.
func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

// problemText reads an RFC 9457 problem (JSON) and the next step it
// recommends; anything else, such as a gateway's HTML or JSON error, is shown
// as its first 200 characters.
func problemText(body []byte) string {
	var problem struct {
		Title     string                     `json:"title"`
		Detail    string                     `json:"detail"`
		NextSteps map[string]json.RawMessage `json:"next_steps"`
	}
	if json.Unmarshal(body, &problem) != nil || problem.Detail+problem.Title == "" {
		return string(body[:min(len(body), 200)])
	}
	text := problem.Detail
	if text == "" {
		text = problem.Title
	}
	var recommended string
	var step struct {
		Href string `json:"href"`
	}
	if json.Unmarshal(problem.NextSteps["recommended"], &recommended) == nil &&
		json.Unmarshal(problem.NextSteps[recommended], &step) == nil && step.Href != "" {
		text += "\nNext step: " + step.Href
	}
	return text
}
