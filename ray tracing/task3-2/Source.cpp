#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <stdlib.h>
#include <cmath>
#include <random>
#include <vector>
#include <omp.h>
#define PI 3.1415926535897932384626433832795

/*
* Thread-safe random number generator
*/

struct RNG {
	RNG() : distrb(0.0, 1.0), engines() {}

	void init(int nworkers) {
		engines.resize(nworkers);
#if 0
		std::random_device rd;
		for (int i = 0; i < nworkers; ++i)
			engines[i].seed(rd());
#else
		std::seed_seq seq{ 1234 };
		std::vector<std::uint32_t> seeds(nworkers);
		seq.generate(seeds.begin(), seeds.end());
		for (int i = 0; i < nworkers; ++i) engines[i].seed(seeds[i]);
#endif
	}

	double operator()() {
		int id = omp_get_thread_num();
		return distrb(engines[id]);
	}

	std::uniform_real_distribution<double> distrb;
	std::vector<std::mt19937> engines;
} rng;


/*
* Basic data types
*/

struct Vec {
	double x, y, z;

	Vec(double x_ = 0, double y_ = 0, double z_ = 0) { x = x_; y = y_; z = z_; }

	Vec operator+ (const Vec &b) const { return Vec(x + b.x, y + b.y, z + b.z); }
	Vec operator- (const Vec &b) const { return Vec(x - b.x, y - b.y, z - b.z); }
	Vec operator* (double b) const { return Vec(x*b, y*b, z*b); }

	Vec mult(const Vec &b) const { return Vec(x*b.x, y*b.y, z*b.z); }
	Vec& normalize() { return *this = *this * (1.0 / std::sqrt(x*x + y * y + z * z)); }
	double dot(const Vec &b) const { return x * b.x + y * b.y + z * b.z; }
	Vec cross(const Vec&b) const { return Vec(y*b.z - z * b.y, z*b.x - x * b.z, x*b.y - y * b.x); }
};

struct Ray {
	Vec o, d;
	Ray(Vec o_, Vec d_) : o(o_), d(d_) {}
};

struct BRDF {
	virtual Vec eval(const Vec &n, const Vec &o, const Vec &i) const = 0;
	virtual void sample(const Vec &n, const Vec &o, Vec &i, double &pdf) const = 0;
	virtual bool isSpecular() const = 0;
};


/*
* Utility functions
*/

inline double clamp(double x) {
	return x < 0 ? 0 : x > 1 ? 1 : x;
}

inline int toInt(double x) {
	return static_cast<int>(std::pow(clamp(x), 1.0 / 2.2) * 255 + .5);
}


/*
* Shapes
*/

struct Sphere {
	Vec p, e;           // position, emitted radiance
	double rad;         // radius
	const BRDF &brdf;   // BRDF

	Sphere(double rad_, Vec p_, Vec e_, const BRDF &brdf_) :
		rad(rad_), p(p_), e(e_), brdf(brdf_) {}

	double intersect(const Ray &r) const { // returns distance, 0 if nohit
		Vec op = p - r.o; // Solve t^2*d.d + 2*t*(o-p).d + (o-p).(o-p)-R^2 = 0
		double t, eps = 1e-4, b = op.dot(r.d), det = b * b - op.dot(op) + rad * rad;
		if (det<0) return 0; else det = sqrt(det);
		return (t = b - det)>eps ? t : ((t = b + det)>eps ? t : 0);
	}
};


/*
* Sampling functions
*/

inline void createLocalCoord(const Vec &n, Vec &u, Vec &v, Vec &w) {
	w = n;
	u = ((std::abs(w.x)>.1 ? Vec(0, 1) : Vec(1)).cross(w)).normalize();
	v = w.cross(u);
}


/*
* BRDFs
*/
Vec uniformRandomPSA(const Vec&n) {
	double z = sqrt(rng());
	double r = sqrt(1.0 - (z*z));
	double phi = 2.0*PI*rng();//random angle of light ��i
	double x = r * cos(phi);
	double y = r * sin(phi);//[x, y] distributes uniformly on a unit disc
	Vec u, v, w;
	createLocalCoord(n, u, v, w);//returns a local coordinate around n->normal
	return u * x + v * y + w * z;//[u,v,w]
}

// Ideal diffuse BRDF
struct DiffuseBRDF : public BRDF {
	DiffuseBRDF(Vec kd_) : kd(kd_) {}

	Vec eval(const Vec &n, const Vec &o, const Vec &i) const {
		return kd * (1.0 / PI);
	}

	void sample(const Vec &n, const Vec &o, Vec &i, double &pdf) const {
		// FIXME
		i = uniformRandomPSA(n);// i= ��i-->incoming light direction
		pdf = i.dot(n) / PI; //
	}
	bool isSpecular() const { return false; }

	Vec kd;
};
// Ideal diffuse BRDF
struct SpecularBRDF : public BRDF {
	SpecularBRDF(Vec ks_) : ks(ks_) {} //ks=specular color
	Vec mirroredDirection(const Vec&n, const Vec&o) const {
		return (n*n.dot(o)*2.0) - o;
	}
	Vec eval(const Vec &n, const Vec &o, const Vec &i) const {
		Vec m = mirroredDirection(n, o);
		if (i.x == m.x &&i.y == m.y &&i.z == m.z)//energy conservation
		{
			return ks * (double(1.0) / n.dot(i));
		}
		else { return Vec(0.0, 0.0, 0.0); }
	}

	void sample(const Vec &n, const Vec &o, Vec &i, double &pdf) const {
		// FIXME
		i = mirroredDirection(n, o);// i= ��i-->incoming light direction
		pdf = 1.0;
	}
	bool isSpecular() const { return true; }
	Vec ks;
};

/*
* Scene configuration
*/

// Pre-defined BRDFs
const DiffuseBRDF leftWall(Vec(.75, .25, .25)),
rightWall(Vec(.25, .25, .75)),
otherWall(Vec(.75, .75, .75)),
blackSurf(Vec(0.0, 0.0, 0.0)),
brightSurf(Vec(0.9, 0.9, 0.9));

const SpecularBRDF specularSurf(Vec(0.999, 0.999, 0.999));

// Scene: list of spheres
const Sphere spheres[] = {
	Sphere(1e5,  Vec(1e5 + 1,40.8,81.6),   Vec(),         leftWall),   // Left
	Sphere(1e5,  Vec(-1e5 + 99,40.8,81.6), Vec(),         rightWall),  // Right
	Sphere(1e5,  Vec(50,40.8, 1e5),      Vec(),         otherWall),  // Back
	Sphere(1e5,  Vec(50, 1e5, 81.6),     Vec(),         otherWall),  // Bottom
	Sphere(1e5,  Vec(50,-1e5 + 81.6,81.6), Vec(),         otherWall),  // Top
	Sphere(16.5, Vec(27,16.5,47),        Vec(),         brightSurf), // Ball 1
	Sphere(16.5, Vec(73,16.5,78),        Vec(),         specularSurf), // Ball 2
	Sphere(5.0,  Vec(50,70.0,81.6),      Vec(50,50,50), blackSurf)   // Light
};

// Camera position & direction
const Ray cam(Vec(50, 52, 295.6), Vec(0, -0.042612, -1).normalize());


/*
* Global functions
*/

bool intersect(const Ray &r, double &t, int &id) {
	double n = sizeof(spheres) / sizeof(Sphere), d, inf = t = 1e20;
	for (int i = int(n); i--;) if ((d = spheres[i].intersect(r)) && d<t) { t = d; id = i; }
	return t<inf;
}
void luminaireSample(const Vec p, double rad, Vec &y1, double &pdf, Vec &n) {
	double xi1 = rng(), xi2 = rng();
	double z = 2.0*xi1 - 1.0;
	double x = pow(1.0 - (z*z), 0.5)*cos(2.0*PI*xi2);
	double y = pow(1.0 - (z*z), 0.5)*sin(2.0*PI*xi2);
	n = Vec(x, y, z).normalize();
	y1 = p + n * rad;
	pdf = 1.0 / (4.0*PI*rad*rad);
}

/*
* KEY FUNCTION: radiance estimator
*/

Vec reflectRadiance(const Ray &r, int depth) {


	double t;                                   // Distance to intersection
	int id = 0;                                 // id of intersected sphere

	if (!intersect(r, t, id)) return Vec();   // if miss, return black
	const Sphere &obj = spheres[id];            // the hit object

	Vec x = r.o + r.d*t;                        // The intersection point
	Vec o = (Vec() - r.d).normalize();          // The outgoing direction (= -r.d)

	Vec n = (x - obj.p).normalize();            // The normal direction
	if (n.dot(o) < 0) n = n * -1.0;

	int rrDepth = 5;
	double survivalProbability = 0.9;
	int p;
	Vec rad = obj.e;   // Emitted radiance
	const BRDF &brdf = obj.brdf;                // Surface BRDF at x


												//directed light
	const Sphere &objy = spheres[7];
	Vec y, ny;
	double pdf, visibility = 0.0;
	luminaireSample(objy.p, objy.rad, y, pdf, ny);

	Vec w1 = (y - x).normalize();
	if (ny.dot(w1*(-1.0)) < 0) ny = ny * -1.0;
	double rad2 = (y - x).dot(y - x);
	// if the light is visible
	int id2 = 0, id3 = 0;
	intersect(Ray(y, w1*(-1.0)), t, id2); //direct radiance coming from the light source
	intersect(Ray(x, w1), t, id3);//light reflect back to the light source is visible
								  // if r's intersection point is the same point as y,visible
	if (id2 == id && id3 == 7) // sphere[7] is the light source,visible
	{
		visibility = 1.0;
	}
	
	Vec rad_from_lightsource = objy.e;
	
	Vec relfRad = rad_from_lightsource.mult(brdf.eval(n, o, w1)*(n.dot(w1))*ny.dot(w1*(-1.0))*visibility*(1.0 / (rad2 * pdf)));





	//indirect radiance same as previous



	if (depth <= rrDepth)
	{
		p = 1.0;
	}
	else
	{
		p = survivalProbability;
	}

	if (rng() < p) {
		Vec i;
		double pdf;
		brdf.sample(n, o, i, pdf);//specularBCDF is a object has the sample function
		Ray y(x, i);
		double scalar2 = n.dot(i) / (pdf*p);
		relfRad= relfRad +  brdf.eval(n, o, i).mult(reflectRadiance(y, depth + 1))*scalar2;
		// i=wi ����  r.o= ����   brdf=���䷽���ϵ�irradianceӰ������radiance�ͷֲ�
	}
	return relfRad;
	
}
Vec receivedRadiance(const Ray &r, int depth,bool flag) {
	double t;                                   // Distance to intersection
	int id = 0;                                 // id of intersected sphere
	if (!intersect(r, t, id)) return Vec();   // if miss, return black
	const Sphere &obj = spheres[id];            // the hit object

	Vec Le = obj.e;                             // Emitted radiance
	if (!obj.brdf.isSpecular())
		return Le + reflectRadiance(r, depth);
	else {
		Vec x = r.o + r.d*t;                        // The intersection point
		Vec o = (Vec() - r.d).normalize();          // The outgoing direction (= -r.d)

		Vec n = (x - obj.p).normalize();            // The normal direction
		if (n.dot(o) < 0) n = n * -1.0;

		Vec rad = obj.e;                             // Emitted radiance
		const BRDF &brdf = obj.brdf;                // Surface BRDF at x

		Vec i;
		double pdf;
		brdf.sample(n, o, i, pdf);

		Ray newR(x, i);
		int rrDepth = 5;
		double survivalProbability = 0.9, p;

		if (depth <= rrDepth)
			p = 1.0;
		else
			p = survivalProbability;

		Vec reflRad;
		if (rng() < p) {
			double scalar = n.dot(i) / (pdf*p);
			return rad + brdf.eval(n, o, i).mult(receivedRadiance(newR, depth + 1, flag))*scalar;
		}
		else
			return rad;
	}
}

/*
* Main function (do not modify)
*/

int main(int argc, char *argv[]) {
	int nworkers = omp_get_num_procs();
	omp_set_num_threads(nworkers);
	rng.init(nworkers);

	int w = 480, h = 360, samps = argc == 2 ? atoi(argv[1]) / 4 : 16; // # samples
	Vec cx = Vec(w*.5135 / h), cy = (cx.cross(cam.d)).normalize()*.5135;
	std::vector<Vec> c(w*h);

#pragma omp parallel for schedule(dynamic, 1)
	for (int y = 0; y < h; y++) {
		for (int x = 0; x < w; x++) {
			const int i = (h - y - 1)*w + x;

			for (int sy = 0; sy < 2; ++sy) {
				for (int sx = 0; sx < 2; ++sx) {
					Vec r;
					for (int s = 0; s<samps; s++) {
						double r1 = 2 * rng(), dx = r1<1 ? sqrt(r1) - 1 : 1 - sqrt(2 - r1);
						double r2 = 2 * rng(), dy = r2<1 ? sqrt(r2) - 1 : 1 - sqrt(2 - r2);
						Vec d = cx * (((sx + .5 + dx) / 2 + x) / w - .5) +
							cy * (((sy + .5 + dy) / 2 + y) / h - .5) + cam.d;
						r = r + receivedRadiance(Ray(cam.o, d.normalize()), 1, true)*(1. / samps);
					}
					c[i] = c[i] + Vec(clamp(r.x), clamp(r.y), clamp(r.z))*.25;
				}
			}
		}
#pragma omp critical
		fprintf(stderr, "\rRendering (%d spp) %6.2f%%", samps * 4, 100.*y / (h - 1));
	}
	fprintf(stderr, "\n");

	// Write resulting image to a PPM file
	FILE *f = fopen("image.ppm", "w");
	fprintf(f, "P3\n%d %d\n%d\n", w, h, 255);
	for (int i = 0; i<w*h; i++)
		fprintf(f, "%d %d %d ", toInt(c[i].x), toInt(c[i].y), toInt(c[i].z));
	fclose(f);

	return 0;
}

