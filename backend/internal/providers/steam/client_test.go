package steam

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func newTestClient(server *httptest.Server) *Client {
	client := NewClient()
	client.httpClient = server.Client()
	client.baseURL = server.URL
	return client
}

func TestParseSpec(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name string
		html string
		want PcSpec
	}{
		{
			name: "typical steam block with list markup and residual tags",
			html: `<strong>Minimum:</strong><br><ul class="bb_ul"><li><strong>OS *:</strong> Windows 10 64-bit<br></li>` +
				`<li><strong>Processor:</strong> Intel Core i5-8400<br></li>` +
				`<li><strong>Memory:</strong> 8 GB RAM<br></li>` +
				`<li><strong>Graphics:</strong> NVIDIA GeForce GTX 1060<br></li>` +
				`<li><strong>Storage:</strong> 70 GB available space</li></ul>`,
			want: PcSpec{
				OS:        "Windows 10 64-bit",
				Processor: "Intel Core i5-8400",
				Memory:    "8 GB RAM",
				Graphics:  "NVIDIA GeForce GTX 1060",
				Storage:   "70 GB available space",
			},
		},
		{
			name: "legacy keys hard drive and video card map to storage and graphics",
			html: `<strong>Video Card:</strong> ATI Radeon HD 4850<br><strong>Hard Drive:</strong> 12 GB HD space`,
			want: PcSpec{Graphics: "ATI Radeon HD 4850", Storage: "12 GB HD space"},
		},
		{
			name: "extra whitespace is normalised to single spaces",
			html: `<strong>Memory:</strong>   8   GB    RAM  <br>`,
			want: PcSpec{Memory: "8 GB RAM"},
		},
		{
			name: "empty values are skipped instead of overwriting fields",
			html: `<strong>OS:</strong><br><strong>Processor:</strong> AMD Ryzen 5 3600<br>`,
			want: PcSpec{Processor: "AMD Ryzen 5 3600"},
		},
		{
			name: "unknown keys are ignored",
			html: `<strong>Sound Card:</strong> DirectX compatible<br><strong>Additional Notes:</strong> SSD recommended`,
			want: PcSpec{},
		},
		{
			name: "empty html yields empty spec",
			html: "",
			want: PcSpec{},
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()
			if got := parseSpec(testCase.html); got != testCase.want {
				t.Errorf("parseSpec() = %+v, want %+v", got, testCase.want)
			}
		})
	}
}

func appDetailsBody(appID, requirementsJSON string) string {
	return `{"` + appID + `":{"success":true,"data":{"pc_requirements":` + requirementsJSON + `}}}`
}

func TestFetchSpecsSuccess(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("appids"); got != "620" {
			t.Errorf("appids query = %q, want %q", got, "620")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(appDetailsBody("620",
			`{"minimum":"<strong>OS:</strong> Windows 7<br><strong>Memory:</strong> 2 GB RAM",`+
				`"recommended":"<strong>OS:</strong> Windows 10"}`)))
	}))
	defer server.Close()

	minimum, recommended, hasData, err := newTestClient(server).FetchSpecs(context.Background(), 620)
	if err != nil {
		t.Fatalf("FetchSpecs error: %v", err)
	}
	if !hasData {
		t.Fatalf("expected hasData=true")
	}
	if minimum.OS != "Windows 7" || minimum.Memory != "2 GB RAM" {
		t.Errorf("unexpected minimum spec: %+v", minimum)
	}
	if recommended.OS != "Windows 10" {
		t.Errorf("unexpected recommended spec: %+v", recommended)
	}
}

func TestFetchSpecsNoData(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name string
		body string
	}{
		{name: "success false yields no data and no error", body: `{"620":{"success":false}}`},
		{name: "empty pc_requirements array yields no data and no error", body: appDetailsBody("620", `[]`)},
		{name: "unexpected json shape yields no data and no error", body: `"not an object"`},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(testCase.body))
			}))
			defer server.Close()

			minimum, recommended, hasData, err := newTestClient(server).FetchSpecs(context.Background(), 620)
			if err != nil {
				t.Fatalf("FetchSpecs error: %v", err)
			}
			if hasData {
				t.Errorf("expected hasData=false, got true (min=%+v rec=%+v)", minimum, recommended)
			}
		})
	}
}

func TestFetchSpecsUnexpectedStatusIsError(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	_, _, _, err := newTestClient(server).FetchSpecs(context.Background(), 620)
	if err == nil {
		t.Fatalf("expected an error for status 404, got nil")
	}
	if !strings.Contains(err.Error(), "404") {
		t.Errorf("error should mention the status, got %q", err.Error())
	}
}

func TestFetchSpecsRetriesOnceOn429(t *testing.T) {
	t.Parallel()

	var mu sync.Mutex
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		mu.Lock()
		requestCount++
		isFirst := requestCount == 1
		mu.Unlock()
		if isFirst {
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(appDetailsBody("620", `{"minimum":"<strong>OS:</strong> Windows 10"}`)))
	}))
	defer server.Close()

	minimum, _, hasData, err := newTestClient(server).FetchSpecs(context.Background(), 620)
	if err != nil {
		t.Fatalf("FetchSpecs should succeed after one retry, got error: %v", err)
	}
	if !hasData || minimum.OS != "Windows 10" {
		t.Errorf("unexpected result after retry: hasData=%v minimum=%+v", hasData, minimum)
	}
	mu.Lock()
	defer mu.Unlock()
	if requestCount != 2 {
		t.Errorf("expected exactly 2 requests (original + one retry), got %d", requestCount)
	}
}

func TestFetchSpecsPersistent429IsError(t *testing.T) {
	t.Parallel()

	var mu sync.Mutex
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		mu.Lock()
		requestCount++
		mu.Unlock()
		w.Header().Set("Retry-After", "0")
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer server.Close()

	_, _, _, err := newTestClient(server).FetchSpecs(context.Background(), 620)
	if err == nil {
		t.Fatalf("expected an error for persistent 429, got nil")
	}
	if !strings.Contains(err.Error(), "rate limited") {
		t.Errorf("error should mention the rate limit, got %q", err.Error())
	}
	mu.Lock()
	defer mu.Unlock()
	if requestCount != 2 {
		t.Errorf("expected exactly 2 requests (original + one retry), got %d", requestCount)
	}
}

func TestFetchSpecsContextCancelledDuringThrottle(t *testing.T) {
	t.Parallel()

	var mu sync.Mutex
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		mu.Lock()
		requestCount++
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(appDetailsBody("620", `{"minimum":"<strong>OS:</strong> Windows 10"}`)))
	}))
	defer server.Close()

	client := newTestClient(server)
	client.last = time.Now()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, _, _, err := client.FetchSpecs(ctx, 620)
	if err == nil {
		t.Fatalf("expected an error for cancelled context during throttle, got nil")
	}
	if !strings.Contains(err.Error(), "context cancelled while throttling") {
		t.Errorf("error should mention the throttle cancellation, got %q", err.Error())
	}
	mu.Lock()
	defer mu.Unlock()
	if requestCount != 0 {
		t.Errorf("expected 0 requests to reach the server, got %d", requestCount)
	}
}

func TestCircuitBreakerOpensAfterThreshold(t *testing.T) {
	t.Parallel()
	var hits int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits++
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer server.Close()

	client := newTestClient(server)

	for i := 0; i < circuitBreakerThreshold+5; i++ {
		_, _, hasData, _ := client.FetchSpecs(context.Background(), 620+i)
		if hasData {
			t.Fatalf("call %d: expected no data under a 429 storm", i)
		}
	}

	if !client.circuitIsOpen() {
		t.Fatalf("circuit should be OPEN after %d consecutive failures", circuitBreakerThreshold)
	}

	hitsAtOpen := hits
	for i := 0; i < 10; i++ {
		if _, _, hasData, _ := client.FetchSpecs(context.Background(), 999000+i); hasData {
			t.Fatalf("post-open call %d should return no data", i)
		}
	}
	if hits != hitsAtOpen {
		t.Errorf("circuit open but network was still hit: %d extra requests", hits-hitsAtOpen)
	}
}

func TestCircuitBreakerResetsOnSuccess(t *testing.T) {
	t.Parallel()
	client := &Client{httpClient: &http.Client{}, baseURL: "http://unused.invalid"}
	for i := 0; i < circuitBreakerThreshold-1; i++ {
		client.recordFailure()
	}
	client.recordSuccess()
	if client.circuitIsOpen() {
		t.Fatal("circuit must stay closed after a success reset it below threshold")
	}
	for i := 0; i < circuitBreakerThreshold-1; i++ {
		client.recordFailure()
	}
	if client.circuitIsOpen() {
		t.Fatal("circuit should still be closed one failure short of threshold")
	}
	if justOpened := client.recordFailure(); !justOpened {
		t.Fatal("the threshold-th failure should open the circuit")
	}
}
